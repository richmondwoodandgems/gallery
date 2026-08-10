# Richmond Wood & Gems

Photo gallery for live edge wood boards set with gemstones and rock under resin.
Static site, hosted free on GitHub Pages.

**Live site:** https://richmondwoodandgems.github.io/gallery/

> Adding photos does not require any of the below — see
> [HOW-TO-ADD-PHOTOS.md](HOW-TO-ADD-PHOTOS.md), which is written for non-developers.

## How it works

```
content/gallery/**       source photos (committed to git — the only thing that changes day to day)
scripts/build-manifest.mjs  scans photos, renders webp derivatives, writes the manifest
public/media/            generated derivatives (gitignored)
src/data/manifest.json   generated gallery data (gitignored)
src/                     React + TypeScript front end
.github/workflows/       builds and deploys to GitHub Pages on every push to main
```

One folder per piece; loose photos in `content/gallery` are reported and ignored.
Inside a folder, a colon separates the piece from the view:

```
A13/
    A13 Hickory.jpeg          key photo (no colon) — the grid cover
    A13 Hickory:top.jpeg      additional views
    A13 Hickory:end1.jpeg
    A13 Hickory.txt           optional description (any .txt in the folder)
```

The title is the most common pre-colon file name that starts with the folder name —
folders are catalog numbers (`A13`) while the files record the wood, so `A13` yields
"A13 Hickory". Folders holding only camera names fall back to the folder name.
Pieces sort by natural name (`A2` before `A10`); byte-identical uploads within a
piece are collapsed to one photo.

Derivatives are cached in `public/media/.cache.json`, keyed by a hash of the source
bytes, so a rebuild only reprocesses photos that actually changed — including in CI,
where the cache is restored via actions/cache. Each photo gets three renditions
(700/1400/2000px webp) served via srcset; GIFs pass through untouched.

Each piece has a stable share URL in the hash (`/#a13`, from the folder name), which
also lets the phone back button close the lightbox instead of leaving the site.

## Local development

```bash
npm install
npm run dev      # regenerates media, then starts Vite on http://localhost:5173
npm run build    # production build into dist/
npm run media    # regenerate derivatives + manifest only
```

`src/data/manifest.json` is generated, so a fresh checkout will show a missing-import
error in the editor until `npm run media` (or `npm run dev`) has run once.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes to GitHub
Pages. `BASE_PATH` is derived from the repository name at build time, so renaming the
repo needs no code change. One-time setup in the repo: **Settings → Pages → Build and
deployment → Source: GitHub Actions**.
