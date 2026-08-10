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

Photos are grouped into "pieces" by name: a top-level `Board.jpg` is the piece's
cover, and a folder named `Board/` holds any additional photos of it. A folder with
no matching cover photo is a piece on its own. An optional `Board.txt` (top-level or
inside the folder) supplies the description.

Inside a folder, a colon separates the piece from the view — `A13 Hickory:top.jpeg`.
The title is the most common pre-colon name that starts with the folder name (so
folder `A13` yields "A13 Hickory"), and the cover is the one photo with no colon.
Pieces are ordered by natural name sort, so `A2` precedes `A10`; byte-identical
uploads within a piece are collapsed to one photo.

Derivatives are cached in `public/media/.cache.json` and keyed by source size and mtime,
so a rebuild only reprocesses photos that actually changed.

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
