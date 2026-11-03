# SpartanX Nutrition Lab — Standalone Test (v0.1)

A **completely separate** test app for a possible future nutrition feature in SpartanX. Nothing here changes or connects to the existing SpartanX or AscensionX applications. The app has its own files and uses a uniquely namespaced browser storage key (`spartanx-nutrition-standalone-v1`).

## What's working

- Look up **real packaged food/drink barcodes** using Open Food Facts (`GET /api/v3/product/{code}`).
- **Live rear camera barcode scanning** in supported mobile browsers, plus photo scan and manual barcode entry.
- Product-detail view with energy (kcal, kJ), protein, carbohydrate, sugar, fat, saturates, fibre, salt, sodium, and available vitamins/minerals.
- **Manual food creation**, with optional micronutrients.
- Portion amounts, meal categories (breakfast/lunch/dinner/snacks), dated daily diary, calculated totals and targets.
- Local custom-food library, recent scanned foods, delete entries, and JSON backup export.
- Responsive dark/charcoal style with Spartan Red highlights.

## Test on iPhone (GitHub Pages)

1. Make a **new public GitHub repository**, e.g. `spartanx-nutrition-lab`, and tick **Add a README file** so the `main` branch exists — do **not** add these files to the main SpartanX or AscensionX repos.
2. Upload `index.html`, `styles.css`, `app.js` and `.nojekyll` into the repo root (or ask ChatGPT to upload the source files after creating the repository).
3. Open repository **Settings → Pages** and choose **Deploy from a branch**, `main`, `/ (root)`; save.
4. Once published, open `https://YOUR-USERNAME.github.io/spartanx-nutrition-lab/` in Safari on your iPhone. This becomes your actual test URL; there isn't a published link until you've done these steps.
5. Tap **Scan → Start camera**, allow camera permission, and aim at a supermarket barcode.
6. Try manual lookup with `3017620422003` (the Open Food Facts example) and create a food with **+ Create food**.

**Why GitHub Pages?** iPhone browsers only allow live camera access on secure origins (HTTPS or localhost). Opening the downloaded HTML via Files may display the interface but camera access may fail. You need internet to load the scanner library and obtain Open Food Facts records.

## Accuracy and data limitations

- Open Food Facts records are **community contributed** and may be incomplete or incorrect. Missing values appear as “Not available”; they are **not** zero.
- Daily totals include reported nutrient amounts only. Missing macros can cause an undercount. Check packaging for reliable figures.
- Some drinks have nutritional values expressed per 100 g in the source data even if the pack says per 100 ml. The app marks the caveat; a production release should handle density and portion units more rigorously.
- Products without *any* energy/macronutrient values cannot be logged; create a manual food instead.
- The prototype stores data only using **browser localStorage** on the device. There is no account, automatic cloud backup, remote sync, meal editing or import yet. GitHub Pages project sites under the **same `username.github.io` origin share browser storage** even across different repository paths; Nutrition Lab uses its own key and its **Clear saved data** button only resets Nutrition Lab data, but deleting all Safari website data for that origin would also erase the other app sites' local data. Back up first.
- Product queries use the read-only Open Food Facts API, no user account or API key. **Production integration should add a small backend/proxy to set the custom User-Agent that Open Food Facts requests**, since browsers cannot reliably override `User-Agent`. Also confirm their applicable API terms/rate limits, attribution and ODbL obligations before release.
- Offline scanning and remote lookups are not supported; manual foods can be entered without internet once the app's files are loaded.

## Architecture

Static files: `index.html`, `styles.css`, `app.js`. No npm install or build tool needed. Camera decoding uses `html5-qrcode@2.3.8` from cdnjs (Apache-2.0). Product lookups use the Open Food Facts v3 endpoint.

## Licence and credits

- Food data: [Open Food Facts](https://world.openfoodfacts.org/) (ODbL; see the Open Food Facts terms for attribution/share-alike).
- Scanner library: [html5-qrcode](https://github.com/mebjas/html5-qrcode) (Apache-2.0).

This is a prototype for testing, not a validated dietary analysis or a live production service.