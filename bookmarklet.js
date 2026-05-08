// Bookmarklet loader for delete-google-photos
// To use: create a bookmark with the URL below as its address,
// or drag the link in README.md to your bookmarks bar.
//
// Requires GitHub Pages to be enabled on this repo (serves JS with correct MIME type).

javascript:void(fetch('https://badgatewayhouse.github.io/delete-google-photos/delete-google-photos.js').then(r=>r.text()).then(eval))
