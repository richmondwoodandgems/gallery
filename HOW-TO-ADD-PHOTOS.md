# How to add photos to the website

You do not need any special software. A web browser and a GitHub account are enough.
Nothing you do here can break the website — if something looks wrong, the old version
stays up until the new one builds correctly.

---

## Adding a new piece

1. Go to the website's project page on GitHub and click the **`content`** folder, then the
   **`gallery`** folder.
2. Click the green **`Add file`** button near the top right, then choose **`Upload files`**.
3. Drag your picture from your computer into the big box on the page (or click
   **`choose your files`** and pick it).
4. Scroll down and click the green **`Commit changes`** button.
5. Wait about **two minutes**, then refresh the website. The new piece will be there.

**The file name becomes the caption**, so rename the file before uploading:

| File name | Caption on the website |
| --- | --- |
| `Walnut River Board.jpg` | Walnut River Board |
| `Cherry Slab with Amethyst.jpg` | Cherry Slab with Amethyst |
| `IMG_4832.jpg` | IMG_4832 *(rename this one!)* |

---

## Adding more photos of the same piece

The picture in the main `gallery` folder is the **cover photo** — the one shown in the
grid. To add more angles and close-ups, put them in a **folder with the same name**:

```
gallery/
  Cherry Slab with Amethyst.jpg      <- cover photo
  Cherry Slab with Amethyst/         <- folder, same name
      close-up.jpg                   <- extra photos; names don't matter
      side view.jpg
      IMG_2041.jpg
```

Visitors click the cover photo and page through everything in the folder.

**To make the folder while uploading:** on the upload page, GitHub keeps folders — so
drag the whole folder from your computer into the upload box. Or, when creating files by
hand, type the folder name and a `/` in the file-name box and GitHub creates the folder.

Extra photos inside a folder show in A-to-Z order of their file names, so name them
`1.jpg`, `2.jpg`, `3.jpg` if you care about the order.

### The way the catalog is named now

The pieces uploaded so far use a folder per catalog number, with the wood named inside:

```
gallery/
  A13/
      A13 Hickory.jpeg            <- cover: no colon, so this is the whole piece
      A13 Hickory:top.jpeg        <- ":something" marks a detail shot
      A13 Hickory:end1.jpeg
      A13 Hickory:end2.jpeg
      A13 Hickory:winebottle.jpeg
```

Two things follow from that, automatically:

- **The caption comes from the file names, not the folder.** That piece is titled
  "A13 Hickory" even though the folder is just `A13`.
- **The photo without a colon is the cover.** If every photo in the folder has a
  colon, the first one alphabetically is used instead.

*(A folder without a matching cover photo also works — the folder name becomes the
caption and the first photo inside becomes the cover.)*

---

## Adding a description (optional)

Make a plain text file with the **same name** as the piece and upload it next to the
cover photo:

- Cover photo: `Cherry Slab with Amethyst.jpg`
- Description: `Cherry Slab with Amethyst.txt`

Whatever you type in that file shows up under the title when a visitor opens the piece.
(A text file dropped inside the piece's folder works too.)

To change the story paragraph shown beneath the gallery, edit `content/about.txt`.

---

## Removing or renaming

1. Click the file's name in `content/gallery`.
2. Click the **pencil icon** (rename) or the **trash can icon** (delete) at the top right.
3. Scroll down, click **`Commit changes`**.

If you rename a piece, rename **both** the cover photo and its folder so they stay
matched. The website updates a couple of minutes later.

---

## Things to know

- **iPhone photos:** If your file ends in `.HEIC`, it will be skipped. On the iPhone go to
  **Settings → Camera → Formats** and pick **Most Compatible** so new photos save as `.JPG`.
  For photos you already took, emailing them to yourself or using "Save to Files" usually
  converts them to `.JPG`.
- **Big photos are fine.** The site automatically makes smaller copies so pages load fast.
  You never need to resize anything.
- **Animated GIFs work** and keep animating.
- **Pieces appear in name order**, counting numbers properly — `A2` comes before
  `A10`, not after it. Naming a new piece `A30` puts it right after `A29`.
- **The same photo uploaded twice is only shown once**, even if one copy ends in
  `.JPG` and the other in `.jpeg`.
- A colon in a file name separates the piece from the view (`A13 Hickory:top.jpeg`).
  Avoid `/` `\` `*` `?` `"` `<` `>` `|` entirely.

---

## If pictures don't show up after 5 minutes

On the project page click the **`Actions`** tab. The most recent line at the top shows
whether the last build worked (green check) or failed (red X). Click it to see what
happened — usually it names the file it did not like.
