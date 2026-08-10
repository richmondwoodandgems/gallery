/**
 * Scans content/gallery for photos, generates web-sized derivatives into
 * public/media, and writes src/data/manifest.json.
 *
 * Nobody has to edit JSON: drop image files into content/gallery (optionally
 * inside a subfolder to make a collection) and this script does the rest.
 *
 * Naming conventions:
 *   "Walnut River Board.jpg"     -> a piece titled "Walnut River Board"; this
 *                                   top-level photo is the piece's cover
 *   "Walnut River Board-2.jpg"   -> another photo of that same piece
 *   "Walnut River Board/"        -> folder of additional photos of that piece;
 *                                   file names inside do not matter
 *   "Walnut River Board.txt"     -> optional description (also honored as any
 *                                   .txt inside the piece's folder)
 *   A folder with no matching top-level photo is a piece on its own: the
 *   folder name is the title and its first photo (by name) is the cover.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'gallery');
const MEDIA_DIR = path.join(ROOT, 'public', 'media');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const CACHE_FILE = path.join(MEDIA_DIR, '.cache.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tif', '.tiff']);
const UNSUPPORTED_EXT = new Set(['.heic', '.heif', '.mov', '.mp4']);

// Grid cards run about 670px wide on a large screen, so the thumbnail is sized
// for that at 2x pixel density rather than for a small tile.
const THUMB_WIDTH = 1400;
const FULL_WIDTH = 2000;

/** Animated formats are passed through untouched so GIFs keep animating. */
const PASSTHROUGH_EXT = new Set(['.gif']);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/**
 * "Walnut River Board-2.jpg" -> { stem: "Walnut River Board", order: 2 }
 *
 * A numbered suffix only counts when a space or dash separates it (max two
 * digits), so camera names like "IMG_8039" keep their digits instead of being
 * split into a bogus piece + order — which would also merge unrelated uploads.
 */
function parseName(basename) {
  const stem = basename.replace(/\.[^.]+$/, '');
  const match = stem.match(/^(.+?)[\s-]+(\d{1,2})$/);
  if (match) {
    return { stem: match[1].trim(), order: Number(match[2]) };
  }
  return { stem: stem.trim(), order: 1 };
}

/** Words left lowercase mid-title so casual file names still read well. */
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'nor', 'of',
  'on', 'or', 'the', 'to', 'up', 'via', 'with',
]);

function titleize(stem) {
  const words = stem
    .replace(/[_]+/g, ' ')
    .replace(/\s*-\s*/g, ' – ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');

  return words
    .map((word, index) => {
      // Anything the owner capitalized themselves is left exactly as typed.
      if (/[A-Z]/.test(word)) return word;
      const isEdge = index === 0 || index === words.length - 1;
      if (!isEdge && MINOR_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Text files are rendered with `white-space: pre-line`, so a line break in the
 * file would show up on the page. Line-wrapping inside a paragraph is collapsed
 * to spaces; a blank line still starts a new paragraph.
 */
function normalizeText(raw) {
  return raw
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Pieces are keyed by lowercased stem so "Board.JPG" and "board/" match up. */
function keyFor(stem) {
  return stem.trim().toLowerCase();
}

function idFor(key) {
  return createHash('sha1').update(key).digest('hex').slice(0, 12);
}

/** "A2" before "A10", and case never decides the order. */
function byNaturalName(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * The descriptive part of a file name, before any ":view" suffix:
 * "A1 Black Walnut:end1.jpeg" -> "A1 Black Walnut"
 */
function baseName(file) {
  return path
    .basename(file)
    .replace(/\.[^.]+$/, '')
    .split(':')[0]
    .trim();
}

/**
 * Folders are named for a catalog number ("A13"), but the wood is only spelled
 * out in the file names inside ("A13 Hickory:top.jpeg"), so the title comes
 * from the most common file name that starts with the folder's name. Folders
 * holding nothing but camera names fall back to the folder name itself.
 */
function folderTitle(folder, files) {
  const counts = new Map();
  for (const file of files) {
    const base = baseName(file);
    if (!base || !base.toLowerCase().startsWith(folder.toLowerCase())) continue;
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  if (counts.size === 0) return folder;
  // Most common wins; a tie goes to the more descriptive (longer) name.
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
}

/**
 * The cover is the photo of the whole piece — the file with no ":view" suffix.
 * The rest follow in natural order.
 */
function orderFolderPhotos(folder, files) {
  const cover = files.find((file) => !path.basename(file).includes(':')) ?? files[0];
  return [cover, ...files.filter((file) => file !== cover)];
}

/** Top-level photos order by their numbered suffix: Board.jpg, Board-2.jpg. */
function orderLoosePhotos(files) {
  return [...files].sort((a, b) => parseName(path.basename(a)).order - parseName(path.basename(b)).order);
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Renders thumb + full derivatives for one source image, reusing previous
 * output when the source file has not changed since the last build.
 */
async function processImage(srcPath, stat, cache, nextCache) {
  const ext = path.extname(srcPath).toLowerCase();
  const rel = path.relative(CONTENT_DIR, srcPath);
  const fingerprint = createHash('sha1')
    .update(`${rel}:${stat.size}:${Math.floor(stat.mtimeMs)}:${THUMB_WIDTH}:${FULL_WIDTH}`)
    .digest('hex')
    .slice(0, 16);

  const cached = cache[rel];
  if (cached && cached.fingerprint === fingerprint) {
    const stillThere = await Promise.all(
      [cached.thumb, cached.full].map((f) =>
        fs.access(path.join(MEDIA_DIR, path.basename(f))).then(
          () => true,
          () => false,
        ),
      ),
    );
    if (stillThere.every(Boolean)) {
      nextCache[rel] = cached;
      return cached;
    }
  }

  if (PASSTHROUGH_EXT.has(ext)) {
    const name = `${fingerprint}${ext}`;
    await fs.copyFile(srcPath, path.join(MEDIA_DIR, name));
    const meta = await sharp(srcPath, { animated: true }).metadata();
    const entry = {
      fingerprint,
      thumb: `media/${name}`,
      full: `media/${name}`,
      width: meta.width ?? 1,
      height: meta.pageHeight ?? meta.height ?? 1,
      animated: true,
    };
    nextCache[rel] = entry;
    return entry;
  }

  const image = sharp(srcPath, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  const thumbName = `${fingerprint}-t.webp`;
  const fullName = `${fingerprint}-f.webp`;

  await image
    .clone()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(MEDIA_DIR, thumbName));

  await image
    .clone()
    .resize({ width: FULL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(MEDIA_DIR, fullName));

  const entry = {
    fingerprint,
    thumb: `media/${thumbName}`,
    full: `media/${fullName}`,
    width: meta.width ?? 1,
    height: meta.height ?? 1,
    animated: false,
  };
  nextCache[rel] = entry;
  return entry;
}

async function main() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(CONTENT_DIR, { recursive: true });

  const files = await walk(CONTENT_DIR);
  const cache = await readCache();
  const nextCache = {};
  const skipped = [];

  // Split the tree: top-level files stand alone; anything deeper belongs to
  // the piece named by its first-level folder.
  const classify = (file) => {
    const segments = path.relative(CONTENT_DIR, file).split(path.sep);
    return segments.length === 1 ? { folder: null } : { folder: segments[0] };
  };

  // A description can live at the top level ("Board.txt") or be any .txt
  // dropped inside the piece's folder.
  const descriptions = new Map();
  for (const file of files) {
    if (path.extname(file).toLowerCase() !== '.txt') continue;
    const { folder } = classify(file);
    const key = folder ? keyFor(folder) : keyFor(parseName(path.basename(file)).stem);
    descriptions.set(key, normalizeText(await fs.readFile(file, 'utf8')));
  }

  const imageFiles = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (UNSUPPORTED_EXT.has(ext)) skipped.push(path.relative(CONTENT_DIR, file));
    else if (IMAGE_EXT.has(ext)) imageFiles.push(file);
  }
  imageFiles.sort(byNaturalName);

  // Gather each piece's files before deciding its title and cover, since both
  // depend on the whole set rather than on any one photo.
  const groups = new Map();
  for (const file of imageFiles) {
    const { folder } = classify(file);
    const key = folder ? keyFor(folder) : keyFor(parseName(path.basename(file)).stem);
    if (!groups.has(key)) groups.set(key, { key, folder, files: [] });
    groups.get(key).files.push(file);
  }

  const items = [];
  const duplicates = [];

  for (const group of [...groups.values()].sort((a, b) => byNaturalName(a.key, b.key))) {
    const { key, folder, files: groupFiles } = group;

    // Identical bytes uploaded twice (often the same shot as .JPG and .jpeg)
    // would otherwise show as two photos of the same piece.
    const seen = new Map();
    const unique = [];
    for (const file of groupFiles) {
      const digest = createHash('sha1').update(await fs.readFile(file)).digest('hex');
      if (seen.has(digest)) {
        duplicates.push(`${path.relative(CONTENT_DIR, file)} (same image as ${seen.get(digest)})`);
        continue;
      }
      seen.set(digest, path.basename(file));
      unique.push(file);
    }

    const ordered = folder ? orderFolderPhotos(folder, unique) : orderLoosePhotos(unique);
    const title = folder ? folderTitle(folder, unique) : parseName(path.basename(unique[0])).stem;

    const photos = [];
    let addedAt = 0;
    for (const [order, file] of ordered.entries()) {
      const stat = await fs.stat(file);
      try {
        photos.push({ order, ...(await processImage(file, stat, cache, nextCache)) });
      } catch (err) {
        skipped.push(`${path.relative(CONTENT_DIR, file)} (${err.message})`);
        continue;
      }
      addedAt = Math.max(addedAt, stat.mtimeMs);
    }
    if (photos.length === 0) continue;

    items.push({
      id: idFor(key),
      title: titleize(title),
      description: descriptions.get(key) ?? '',
      addedAt: new Date(addedAt).toISOString(),
      photos,
    });
  }

  let about = '';
  try {
    about = normalizeText(await fs.readFile(path.join(ROOT, 'content', 'about.txt'), 'utf8'));
  } catch {
    /* optional */
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    about,
    items,
  };

  await fs.writeFile(path.join(DATA_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(CACHE_FILE, JSON.stringify(nextCache));

  // Social-preview image (index.html og:image): newest piece, cropped to the
  // 1200x630 Open Graph frame, as JPEG for link-unfurler compatibility.
  if (items.length > 0) {
    await sharp(path.join(ROOT, 'public', items[0].photos[0].full))
      .resize(1200, 630, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toFile(path.join(ROOT, 'public', 'og.jpg'));
  }

  // Remove derivatives that no longer belong to any source file.
  const keep = new Set(Object.values(nextCache).flatMap((e) => [path.basename(e.thumb), path.basename(e.full)]));
  for (const name of await fs.readdir(MEDIA_DIR)) {
    if (name.startsWith('.') || keep.has(name)) continue;
    await fs.rm(path.join(MEDIA_DIR, name), { force: true });
  }

  console.log(`Gallery: ${items.length} piece(s), ${Object.keys(nextCache).length} photo(s).`);
  if (duplicates.length) {
    console.warn('\nIgnored duplicate uploads:');
    for (const d of duplicates) console.warn(`  - ${d}`);
  }
  if (skipped.length) {
    console.warn('\nSkipped files (convert these to JPG or PNG and re-upload):');
    for (const s of skipped) console.warn(`  - ${s}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
