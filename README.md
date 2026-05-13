# delete-google-photos

Bulk-delete all photos from a Google Photos library. Google's UI makes this impossible at scale — there's no select-all, and the [Google Photos Library API](https://developers.google.com/photos/library/guides/overview) intentionally omits a delete endpoint.

This script automates the DOM interactions: select a batch of photos → move to trash → confirm → repeat until empty.

---

## Quick Start: Console Method

1. Open [photos.google.com](https://photos.google.com) and make sure you can see your photo grid
2. Press **F12** (or **Cmd+Option+I** on Mac) to open DevTools
3. Click the **Console** tab
4. Copy the contents of [`delete-google-photos.js`](delete-google-photos.js) and paste it into the console
5. Press **Enter**
6. Watch the progress in the console. Leave the tab open and active.

To stop at any time, run this in the console:
```javascript
window.__deletePhotosAbort = true
```

---

## Quick Start: Bookmarklet Method

Drag this link to your bookmarks bar:

<a href="javascript:void(fetch('https://badgatewayhouse.github.io/delete-google-photos/delete-google-photos.js').then(r=>r.text()).then(eval))">Delete All Google Photos</a>

Then navigate to [photos.google.com](https://photos.google.com) and click the bookmark.

> **Requires GitHub Pages** to be enabled on this repo (already configured). Raw GitHub URLs serve `text/plain` which browsers reject for script injection.

---

## Configuration

Edit the constants at the top of `delete-google-photos.js`:

| Constant | Default | Description |
|----------|---------|-------------|
| `BATCH_SIZE` | `50` | Photos selected per batch |
| `DELAY_MS` | `2000` | Pause between batches (ms) |
| `SETTLE_MS` | `1500` | DOM settle wait after each deletion (ms) |
| `TIMEOUT_MS` | `15000` | Max wait for an element to appear (ms) |

---

## Important Warnings

- **Deletion moves photos to Trash**, not permanent deletion. Photos stay in Trash for 60 days. To delete immediately: open [Trash](https://photos.google.com/trash) → *Empty trash*.
- **Keep the tab open and active** while the script runs. Backgrounding the tab may throttle timers.
- **Prevent your computer from sleeping or locking.** Screen lock or sleep will pause the script (and may suspend network requests mid-deletion). Disable sleep in your OS settings, or use a tool like [Amphetamine](https://apps.apple.com/us/app/amphetamine/id937984704) (macOS) / [caffeinate](https://ss64.com/mac/caffeinate.html) / `systemd-inhibit` (Linux) / *Settings → Power* (Windows) for the duration of the run.
- **English locale only** — selectors use `aria-label` attributes which change based on browser language. See [Updating Selectors](#updating-selectors) to adapt for other languages.
- **May break when Google updates their UI.** Check this repo for updated selectors if the script stops working.

---

## Updating Selectors

Google occasionally changes the DOM structure of Photos. If the script stops working, the selectors at the top of `delete-google-photos.js` likely need updating.

To find current selectors:

1. Open [photos.google.com](https://photos.google.com) in DevTools
2. Run these snippets in the console:

```javascript
// Find photo checkboxes
document.querySelectorAll('div[role="checkbox"][aria-label^="Photo - "]')

// After manually selecting a photo, find the delete button
document.querySelector('button[aria-label="Move to trash"]')

// After clicking delete, find the confirmation dialog
document.querySelector('[role="dialog"]')
```

3. Update the `SEL_*` constants at the top of the script, submit a PR, and bump the date comment.

---

## How It Works

The script simulates the same clicks a user would make:

1. Scrolls down to trigger lazy-loading of photo tiles
2. Finds unselected photo checkboxes (hidden at `opacity: 0` but programmatically clickable)
3. Clicks up to `BATCH_SIZE` checkboxes to select them
4. Clicks the "Move to trash" button in the selection toolbar
5. Clicks "Got it" in the confirmation dialog
6. Waits for the DOM to settle (using `MutationObserver`)
7. Repeats until no photos remain

---

## Tips for Large Libraries

- For very large libraries (10K+ photos), increase `BATCH_SIZE` to `100` and reduce `DELAY_MS` to `1000`
- The script counts photos moved to trash in the console — note the final count for your records
- Empty the Trash afterward if you want to reclaim storage immediately

---

## Tip Jar

If this saved you hours of clicking, consider sponsoring:

[GitHub Sponsors](https://github.com/sponsors/badgatewayhouse) · [Ko-fi](https://ko-fi.com/badgatewayhouse)
