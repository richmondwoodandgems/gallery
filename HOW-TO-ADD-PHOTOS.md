# How to add photos to the website

You do not need any special software. A web browser and a GitHub account are enough.
Nothing you do here can break the website — if something looks wrong, the old version
stays up until the new one builds correctly.

**Always start from this page**, so your files land in the right place:

> https://github.com/richmondwoodandgems/gallery/tree/main/content/gallery

Bookmark it. GitHub uploads into whichever folder you are looking at, so uploading from
the project's front page puts the photos in the wrong spot and they will not appear.

---

## The one rule: every piece gets its own folder

```
content/gallery/
    A13/                              <- one folder per piece
        A13 Hickory.jpeg              <- the main photo (no colon)
        A13 Hickory:top.jpeg          <- other views (colon, then the view)
        A13 Hickory:end1.jpeg
        A13 Hickory:end2.jpeg
        A13 Hickory:winebottle.jpeg
        A13 Hickory.txt               <- optional description
```

- **The main photo is the one without a colon.** It's what shows in the gallery grid.
- **Other views use a colon:** `<name>:<view>`. The part after the colon is only for
  your own organizing — visitors never see it.
- **The caption comes from the file names, not the folder name.** The folder above is
  called `A13`, but the piece is titled **A13 Hickory** because that's what the photos
  inside are called.
- **Photos loose in `content/gallery` are ignored.** They must be inside a folder.

---

## Adding a new piece

1. Go to the gallery folder (link above).
2. Click **`Add file`** → **`Upload files`**.
3. Drag the piece's folder from your computer straight into the upload box. GitHub keeps
   the folder and everything in it.
4. Scroll down, click **`Commit changes`**.
5. Wait about **two minutes** and refresh the website.

**No folder made yet?** Click **`Add file`** → **`Create new file`**, and in the name box
type the folder name, then a `/`, then a file name — for example `A30/notes.txt`. GitHub
creates the folder as you type the slash. Commit, then upload the photos into it.

---

## Adding a description

Put a plain text file in the piece's folder — any name ending in `.txt`. Whatever you
type shows up beneath the photos when someone opens the piece.

```
A13/
    A13 Hickory.jpeg
    A13 Hickory.txt      <- "Hickory with amethyst and clear quartz. 34 inches."
```

It shows up exactly the way you type it: every line you write stays on its own line,
and leaving a blank line starts a new paragraph. Long paragraphs wrap on their own, so
don't press return in the middle of a sentence.

To change the paragraph shown beneath the whole gallery, edit `content/about.txt`.

---

## Removing or renaming

1. Click the file's name.
2. Click the **pencil icon** (rename) or the **trash can icon** (delete) at the top right.
3. Scroll down, click **`Commit changes`**.

To rename a piece, rename the **files** inside — the caption comes from them. Renaming
the folder alone only changes where it sorts.

To delete a whole piece, open each file in the folder and delete it; when the last file
is gone, GitHub removes the folder.

---

## Things to know

- **iPhone photos:** If your file ends in `.HEIC`, it will be skipped. On the iPhone go to
  **Settings → Camera → Formats** and pick **Most Compatible** so new photos save as `.JPG`.
  For photos you already took, emailing them to yourself or using "Save to Files" usually
  converts them to `.JPG`.
- **Big photos are fine.** The site automatically makes smaller copies so pages load fast.
  You never need to resize anything.
- **Animated GIFs work** and keep animating.
- **Every piece has its own link.** Open a piece and copy the address bar — something
  like `.../gallery/#a13` — and that link takes people straight to that piece.
- **Pieces appear in folder-name order**, counting numbers properly — `A2` comes before
  `A10`, not after it. Naming a new folder `A30` puts it right after `A29`.
- **The same photo uploaded twice is only shown once**, even if one copy ends in `.JPG`
  and the other in `.jpeg`.
- A colon separates the piece from the view. Avoid `/` `\` `*` `?` `"` `<` `>` `|`
  entirely.

---

## If pictures don't show up after 5 minutes

On the project page click the **`Actions`** tab. The most recent line at the top shows
whether the last build worked (green check) or failed (red X). Click it to see what
happened — it lists any photos it ignored and why.
