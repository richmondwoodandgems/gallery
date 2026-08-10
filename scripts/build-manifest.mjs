/**
 * Scans content/gallery for photos, generates web-sized derivatives into
 * public/media, and writes src/data/manifest.json.
 *
 * Nobody has to edit JSON: drop image files into content/gallery (optionally
 * inside a subfolder to make a collection) and this script does the rest.
 *
 * One folder per piece. Inside a folder:
 *   "<name>.jpg"          -> the key photo, shown in the gallery grid
 *   "<name>:<view>.jpg"   -> another view of the piece ("A13 Hickory:top.jpg")
 *   "<anything>.txt"      -> optional description, shown alongside the photos
 *
 * The title comes from the file names rather than the folder, because the
 * folder is a catalog number ("A13") while the files name the wood ("A13
 * Hickory"). Loose photos sitting outside a folder are reported and ignored.
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

// Grid cards run about 670px wide on a large screen. The large thumb covers
// that at 2x pixel density; the small one serves phones and 1x screens via
// srcset, and doubles as the filmstrip thumbnail.
const THUMB_WIDTH = 1400;
const THUMB_SMALL_WIDTH = 700;
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
 * The key photo leads: the one with no ":view" suffix. A folder named for the
 * piece itself ("Board/board.jpg") wins over any other colon-free file, so an
 * odd name inside cannot displace it. Remaining views follow in natural order.
 */
function orderFolderPhotos(folder, files) {
  const plain = files.filter((file) => !path.basename(file).includes(':'));
  const key =
    plain.find((file) => baseName(file).toLowerCase() === folder.toLowerCase()) ?? plain[0] ?? files[0];
  return [key, ...files.filter((file) => file !== key)];
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
 * output when the source content has not changed since the last build.
 *
 * The fingerprint is content-based (not mtime), so the derivative cache
 * survives CI, where every checkout rewrites file timestamps.
 */
async function processImage(srcPath, digest, cache, nextCache) {
  const ext = path.extname(srcPath).toLowerCase();
  const rel = path.relative(CONTENT_DIR, srcPath);
  const fingerprint = createHash('sha1')
    .update(`${digest}:${THUMB_WIDTH}:${THUMB_SMALL_WIDTH}:${FULL_WIDTH}`)
    .digest('hex')
    .slice(0, 16);

  const cached = cache[rel];
  if (cached && cached.fingerprint === fingerprint) {
    const stillThere = await Promise.all(
      [cached.thumb, cached.thumbSmall, cached.full].map((f) =>
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
      thumbSmall: `media/${name}`,
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
  const thumbSmallName = `${fingerprint}-s.webp`;
  const fullName = `${fingerprint}-f.webp`;

  await image
    .clone()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(MEDIA_DIR, thumbName));

  await image
    .clone()
    .resize({ width: THUMB_SMALL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(MEDIA_DIR, thumbSmallName));

  await image
    .clone()
    .resize({ width: FULL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(MEDIA_DIR, fullName));

  const entry = {
    fingerprint,
    thumb: `media/${thumbName}`,
    thumbSmall: `media/${thumbSmallName}`,
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

  // Any .txt dropped inside a piece's folder describes it. If someone leaves
  // more than one, the first by name wins so the result is never arbitrary.
  const descriptions = new Map();
  const textFiles = files.filter((file) => path.extname(file).toLowerCase() === '.txt').sort(byNaturalName);
  for (const file of textFiles) {
    const { folder } = classify(file);
    if (!folder) continue;
    const key = keyFor(folder);
    if (descriptions.has(key)) continue;
    descriptions.set(key, normalizeText(await fs.readFile(file, 'utf8')));
  }

  const imageFiles = [];
  const loose = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (UNSUPPORTED_EXT.has(ext)) skipped.push(path.relative(CONTENT_DIR, file));
    else if (!IMAGE_EXT.has(ext)) continue;
    else if (classify(file).folder === null) loose.push(path.basename(file));
    else imageFiles.push(file);
  }
  imageFiles.sort(byNaturalName);

  // Gather each piece's files before deciding its title and key photo, since
  // both depend on the whole set rather than on any one photo.
  const groups = new Map();
  for (const file of imageFiles) {
    const { folder } = classify(file);
    const key = keyFor(folder);
    if (!groups.has(key)) groups.set(key, { key, folder, files: [] });
    groups.get(key).files.push(file);
  }

  const items = [];
  const duplicates = [];

  for (const group of [...groups.values()].sort((a, b) => byNaturalName(a.key, b.key))) {
    const { key, folder, files: groupFiles } = group;

    // Identical bytes uploaded twice (often the same shot as .JPG and .jpeg)
    // would otherwise show as two photos of the same piece. The digest also
    // fingerprints the derivative cache, so it is computed exactly once.
    const seen = new Map();
    const unique = [];
    const digests = new Map();
    for (const file of groupFiles) {
      const digest = createHash('sha1').update(await fs.readFile(file)).digest('hex');
      if (seen.has(digest)) {
        duplicates.push(`${path.relative(CONTENT_DIR, file)} (same image as ${seen.get(digest)})`);
        continue;
      }
      seen.set(digest, path.basename(file));
      digests.set(file, digest);
      unique.push(file);
    }

    const ordered = orderFolderPhotos(folder, unique);
    const title = folderTitle(folder, unique);

    const photos = [];
    let addedAt = 0;
    for (const [order, file] of ordered.entries()) {
      try {
        photos.push({ order, ...(await processImage(file, digests.get(file), cache, nextCache)) });
      } catch (err) {
        skipped.push(`${path.relative(CONTENT_DIR, file)} (${err.message})`);
        continue;
      }
      addedAt = Math.max(addedAt, (await fs.stat(file)).mtimeMs);
    }
    if (photos.length === 0) continue;

    items.push({
      id: idFor(key),
      // The slug is the piece's stable share URL: /#a13
      slug: key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || idFor(key),
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

  // Social-preview image (index.html og:image): first piece, cropped to the
  // 1200x630 Open Graph frame, as JPEG for link-unfurler compatibility.
  // The apple-touch-icon (home-screen bookmark) comes from the same photo.
  if (items.length > 0) {
    const lead = path.join(ROOT, 'public', items[0].photos[0].full);
    await sharp(lead).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(path.join(ROOT, 'public', 'og.jpg'));
    await sharp(lead).resize(180, 180, { fit: 'cover' }).png().toFile(path.join(ROOT, 'public', 'apple-touch-icon.png'));
  }

  // Remove derivatives that no longer belong to any source file.
  const keep = new Set(
    Object.values(nextCache).flatMap((e) => [path.basename(e.thumb), path.basename(e.thumbSmall), path.basename(e.full)]),
  );
  for (const name of await fs.readdir(MEDIA_DIR)) {
    if (name.startsWith('.') || keep.has(name)) continue;
    await fs.rm(path.join(MEDIA_DIR, name), { force: true });
  }

  console.log(`Gallery: ${items.length} piece(s), ${Object.keys(nextCache).length} photo(s).`);
  if (loose.length) {
    console.warn('\nIgnored photos that are not inside a folder (every piece needs its own folder):');
    for (const l of loose) console.warn(`  - ${l}`);
  }
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
