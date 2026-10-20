## re: panel — Custom Fonts

The `re:` panel now supports full typographic customization. You can upload custom fonts (`.woff`, `.woff2`, `.ttf`, `.otf`) for specific elements on the page, bypassing system defaults. 

Because this is aesthetic slop, we mapped every text class to its own slot:
- **Bookmark Titles**
- **Tooltip / Descriptions**
- **Group Headings**
- **Search Bar Input**
- **Search Dropdown**
- **re: Menu Panel**
- **System UI** (Load buttons, empty state text)

The files are loaded natively via the `FontFace` API, injected into the DOM, and persisted across reloads using `localStorage`. You can freely mix and match fonts (e.g., a chaotic display font for group headings, a clean sans for the search bar, and a serif for tooltips).

### Caveats
- Fonts are saved as base64 strings in your browser's `localStorage`. A standard `.woff2` file is small enough, but if you upload a 15MB `.ttf` file, it might exceed the 5MB `localStorage` quota. If that happens, it works for the current session but won't survive a refresh (a popup will warn you).
- This is purely cosmetic. Default system fonts are restored the moment you click the "X" next to the upload button.
