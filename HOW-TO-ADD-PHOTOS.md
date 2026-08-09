# How to add photos to the website

You do not need any special software. A web browser and a GitHub account are enough.
Nothing you do here can break the website — if something looks wrong, the old version
stays up until the new one builds correctly.

---

## Adding pictures

1. Go to the website's project page on GitHub and click the **`content`** folder, then the
   **`gallery`** folder.
2. Click the green **`Add file`** button near the top right, then choose **`Upload files`**.
3. Drag your pictures from your computer into the big box on the page (or click
   **`choose your files`** and pick them).
4. Scroll down and click the green **`Commit changes`** button.
5. Wait about **two minutes**, then refresh the website. The new pictures will be there.

That's it.

---

## Naming your pictures

**The file name becomes the caption under the picture.** Before you upload, rename the
file to whatever you want people to read.

| File name | Caption on the website |
| --- | --- |
| `Walnut River Board.jpg` | Walnut River Board |
| `Cherry Slab with Amethyst.jpg` | Cherry Slab with Amethyst |
| `IMG_4832.jpg` | IMG_4832 *(rename this one!)* |

### Several photos of the same piece

Put a dash and a number at the end. They will be grouped together as one piece, and
visitors can click through them.

```
Cherry Slab with Amethyst.jpg
Cherry Slab with Amethyst-2.jpg
Cherry Slab with Amethyst-3.jpg
```

The picture **without** a number is the one shown in the gallery grid.

---

## Adding a description (optional)

Make a plain text file with the **same name** as the picture and upload it alongside:

- Picture: `Cherry Slab with Amethyst.jpg`
- Description: `Cherry Slab with Amethyst.txt`

Whatever you type in that text file shows up under the title.

To change the story paragraph shown beneath the gallery, edit `content/about.txt`.

---

## Making sections (optional)

If you want the website split into groups — say **Tables**, **Serving Boards**, and
**Small Pieces** — put the photos into folders with those names inside `content/gallery`.
Buttons appear at the top of the site so visitors can filter.

To make a folder while uploading, drag a whole folder from your computer into the upload
box. GitHub keeps the folder name.

---

## Removing or renaming a picture

1. Click the picture's file name in `content/gallery`.
2. Click the **pencil icon** (rename) or the **trash can icon** (delete) at the top right.
3. Scroll down, click **`Commit changes`**.

The website updates a couple of minutes later.

---

## Things to know

- **iPhone photos:** If your file ends in `.HEIC`, it will be skipped. On the iPhone go to
  **Settings → Camera → Formats** and pick **Most Compatible** so new photos save as `.JPG`.
  For photos you already took, emailing them to yourself or using "Save to Files" usually
  converts them to `.JPG`.
- **Big photos are fine.** The site automatically makes smaller copies so pages load fast.
  You never need to resize anything.
- **Animated GIFs work** and keep animating.
- **Newest photos appear first** in the gallery.
- Don't use the characters `/` `\` `:` `*` `?` `"` `<` `>` `|` in file names.

---

## If pictures don't show up after 5 minutes

On the project page click the **`Actions`** tab. The most recent line at the top shows
whether the last build worked (green check) or failed (red X). Click it to see what
happened — usually it names the file it did not like.
