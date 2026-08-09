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

/** "Walnut River Board-2.jpg" -> { key: "walnut river board", order: 2 } */
function parseName(basename) {
  const stem = basename.replace(/\.[^.]+$/, '');
  const match = stem.match(/^(.*?)[\s._-]*(\d{1,3})$/);
  if (match && match[1].trim().length > 0) {
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

  const pieces = new Map();
  const ensurePiece = (key, title) => {
    if (!pieces.has(key)) {
      pieces.set(key, {
        id: idFor(key),
        title: titleize(title),
        description: descriptions.get(key) ?? '',
        addedAt: 0,
        photos: [],
      });
    }
    return pieces.get(key);
  };

  const imageFiles = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (UNSUPPORTED_EXT.has(ext)) skipped.push(path.relative(CONTENT_DIR, file));
    else if (IMAGE_EXT.has(ext)) imageFiles.push(file);
  }
  // Natural sort so "photo-2" comes before "photo-10" inside folders.
  imageFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  let folderIndex = 0;
  for (const file of imageFiles) {
    const { folder } = classify(file);
    const stat = await fs.stat(file);

    let derived;
    try {
      derived = await processImage(file, stat, cache, nextCache);
    } catch (err) {
      skipped.push(`${path.relative(CONTENT_DIR, file)} (${err.message})`);
      continue;
    }

    let piece;
    let order;
    if (folder === null) {
      // Top-level photo: cover (order 1) or a numbered companion.
      const { stem, order: n } = parseName(path.basename(file));
      piece = ensurePiece(keyFor(stem), stem);
      order = n;
    } else {
      // Folder photo: always sorts after the top-level cover and companions,
      // in natural filename order.
      piece = ensurePiece(keyFor(folder), folder);
      order = 1000 + folderIndex++;
    }

    piece.addedAt = Math.max(piece.addedAt, stat.mtimeMs);
    piece.photos.push({ order, ...derived });
  }

  const items = [...pieces.values()]
    .map((piece) => ({
      ...piece,
      addedAt: new Date(piece.addedAt).toISOString(),
      photos: piece.photos.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title));

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
  if (skipped.length) {
    console.warn('\nSkipped files (convert these to JPG or PNG and re-upload):');
    for (const s of skipped) console.warn(`  - ${s}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
