// delete-google-photos.js
// Bulk-deletes all photos from a Google Photos library via DOM automation.
// Paste in DevTools console on photos.google.com, or load via bookmarklet.
// To stop: window.__deletePhotosAbort = true

(async () => {
  // ─── Config ──────────────────────────────────────────────────────────────────
  const BATCH_SIZE = 50;      // photos to select per batch
  const DELAY_MS   = 2000;    // pause between batches (ms)
  const SETTLE_MS  = 1500;    // wait after DOM mutation settles (ms)
  const TIMEOUT_MS = 15000;   // max wait for an element to appear (ms)
  const POLL_MS    = 200;     // polling interval for waitForElement (ms)

  // ─── Selectors ───────────────────────────────────────────────────────────────
  // Verified 2025-05-06 on photos.google.com (English locale)
  const SEL_PHOTO_CHECKBOX  = 'div[role="checkbox"][aria-label^="Photo - "]';
  const SEL_PHOTO_LINK      = 'a[aria-label^="Photo - "]';
  const SEL_MOVE_TO_TRASH   = 'button[aria-label="Move to trash"]';
  const SEL_DIALOG          = '[role="dialog"]';
  const SEL_CONFIRM_TEXTS   = ['Move to trash', 'Got it'];  // varies by dialog variant
  const SEL_CANCEL_TEXT     = 'Cancel';

  // ─── Guard: prevent parallel runs ────────────────────────────────────────────
  if (window.__deletePhotosRunning) {
    console.warn('[delete-google-photos] Already running. Set window.__deletePhotosAbort = true to stop.');
    return;
  }
  window.__deletePhotosRunning = true;
  window.__deletePhotosAbort   = false;

  // ─── Utilities ───────────────────────────────────────────────────────────────
  const log = (msg) => console.log(`[delete-google-photos] ${msg}`);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function waitForElement(selector, timeout = TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const el = document.querySelector(selector);
        if (el && el.offsetHeight > 0) return resolve(el);
        if (Date.now() - start > timeout) {
          return reject(new Error(
            `Timed out waiting for "${selector}". ` +
            `Google may have updated their UI — check github.com/badgatewayhouse/delete-google-photos for updates.`
          ));
        }
        setTimeout(check, POLL_MS);
      };
      check();
    });
  }

  function waitForElementGone(selector, timeout = TIMEOUT_MS) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = document.querySelector(selector);
        if (!el || el.offsetHeight === 0) return resolve();
        if (Date.now() - start > timeout) {
          log(`Warning: "${selector}" still in DOM after ${timeout}ms, continuing anyway.`);
          return resolve();
        }
        setTimeout(check, POLL_MS);
      };
      check();
    });
  }

  function waitForDomSettle(quietMs = SETTLE_MS) {
    return new Promise(resolve => {
      let timer;
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => { observer.disconnect(); resolve(); }, quietMs);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      // Resolve immediately if DOM is already quiet
      timer = setTimeout(() => { observer.disconnect(); resolve(); }, quietMs);
    });
  }

  // ─── Core ────────────────────────────────────────────────────────────────────

  async function scrollAndLoadPhotos() {
    // Scroll top-to-bottom in steps to trigger virtual DOM rendering
    window.scrollTo(0, 0);
    await sleep(600);
    const step = window.innerHeight * 0.8;
    let pos = 0;
    while (pos < document.body.scrollHeight) {
      pos += step;
      window.scrollTo(0, pos);
      await sleep(400);
    }
    await sleep(800);
  }

  function selectPhotos(batchSize) {
    const checkboxes = Array.from(document.querySelectorAll(SEL_PHOTO_CHECKBOX))
      .filter(el => el.getAttribute('aria-checked') !== 'true');
    const toSelect = checkboxes.slice(0, batchSize);
    toSelect.forEach(el => el.click());
    return toSelect.length;
  }

  async function clickMoveToTrash() {
    const btn = await waitForElement(SEL_MOVE_TO_TRASH);
    btn.click();
  }

  async function confirmDeletion() {
    const dialog = await waitForElement(SEL_DIALOG);
    await sleep(500); // let dialog buttons render
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const confirm = buttons.find(b => SEL_CONFIRM_TEXTS.includes(b.textContent.trim()))
                 || buttons.find(b => b.textContent.trim() !== SEL_CANCEL_TEXT);
    if (!confirm) throw new Error(`Could not find confirm button in dialog. Button texts: ${buttons.map(b => b.textContent.trim()).join(', ')}`);
    confirm.click();
  }

  // ─── Main loop ───────────────────────────────────────────────────────────────
  log('Starting. To stop gracefully, run: window.__deletePhotosAbort = true');
  log(`Config: BATCH_SIZE=${BATCH_SIZE}, DELAY_MS=${DELAY_MS}`);

  let totalDeleted = 0;

  try {
    while (true) {
      if (window.__deletePhotosAbort) {
        log(`Aborted by user. Moved ${totalDeleted} photos to trash.`);
        break;
      }

      // Scroll top-to-bottom to populate the virtual DOM with photo checkboxes
      await scrollAndLoadPhotos();

      const photoCount = document.querySelectorAll(SEL_PHOTO_LINK).length;
      if (photoCount === 0) {
        log(`No photos found in the grid. Done!`);
        break;
      }

      let selected = selectPhotos(BATCH_SIZE);
      if (selected === 0) {
        // Google Photos virtual scroll may not have rendered all checkboxes yet.
        // Do one more full scroll pass and retry before giving up.
        log(`No unselected photos visible — rescrolling to check for more...`);
        await scrollAndLoadPhotos();
        selected = selectPhotos(BATCH_SIZE);
        if (selected === 0) {
          log(`No unselected photos found after rescan. Done!`);
          break;
        }
      }

      log(`Selected ${selected} photos. Moving to trash...`);

      await clickMoveToTrash();
      await confirmDeletion();

      // Wait for the confirmation dialog to close and DOM to settle
      await waitForElementGone(SEL_DIALOG);
      await waitForDomSettle(SETTLE_MS);

      totalDeleted += selected;
      log(`Progress: ${totalDeleted} photos moved to trash so far.`);

      if (window.__deletePhotosAbort) {
        log(`Aborted by user. Moved ${totalDeleted} photos to trash.`);
        break;
      }

      await sleep(DELAY_MS);
    }

    log(`Done! Moved ${totalDeleted} photos to trash.`);
    log(`Photos stay in Trash for 60 days. To delete immediately: open Trash → "Empty trash".`);
  } catch (err) {
    log(`Error: ${err.message}`);
    log(`If selectors are outdated, check: github.com/badgatewayhouse/delete-google-photos`);
  } finally {
    window.__deletePhotosRunning = false;
  }
})();
