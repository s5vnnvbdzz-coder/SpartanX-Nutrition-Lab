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

## Nutrition Lab v0.2 — interface test

- **Targets:** moved from bottom navigation to a centred dartboard icon in the upper-right of Energy Balance.
- **Date:** calendar selection uses a calendar-only icon button; previous/next-day arrows remain.
- **Liquids:** dedicated diary card directly under Snacks, with one-tap 250 ml water logging, custom water amounts, and drink entries. Items entered in ml contribute to the fluid subtotals; all drinks contribute to calorie and macro totals.
- **Barcode flow:** one Scan Barcode button starts the camera; scanning stops after successful lookup or when leaving Scan. Create Food remains alongside it; manual barcode entry is still available.
- **Settings:** header icon redrawn; Appearance (Spartan Red, Olympian Gold and Arctic Blue themes), About this prototype, and Your Data (export or clear) now live here. The bottom navigation has Today, Scan and My Foods only.
- **Data:** the existing local-storage key and prior nutrition logs are preserved. Themes are also saved locally. This project remains separate from SpartanX and AscensionX.

## Nutrition Lab v0.3 — hydration controls and macro calorie budget

- Liquids now has a water quantity control: − 10 ml | log selected ml | + 10 ml. Starts at 250 ml, with 10–5,000 ml bounds. Adjusting does not log water until you press the middle button.
- Targets now provides a live calorie-allocation chart showing how many kcal protein, carbs and fat contribute using 4/4/9 kcal per gram.
- Auto-balance defaults to on: changing calories, protein, or carbs updates fat to approximately fill the budget. Changing fat instead updates carbs. When a fixed macro selection already exceeds the budget, adjustable macros bottom out at 0 and the preview reports an overage.
- Auto-balance can be turned off for independent macro edits. There is also a manual balance action. Differences of up to 25 kcal are labelled Balanced.
- The original local-storage key and existing diary remain unchanged. New files use ?v=0.3 to avoid stale iPhone browser assets.

## Nutrition Lab v0.4 — Home and Settings navigation

- The start screen remains the daily diary, now labelled **Home** instead of Today in the bottom navigation.
- Settings records which screen opened it and provides an on-screen Back button that returns to Home, Scan, My Foods, or Targets as appropriate.
- The bottom navigation is hidden on Settings and restored upon leaving; the page uses a reduced bottom inset.
- Settings shows non-collapsible **About this prototype** at the top, collapsed-by-default **Appearance** second, and non-collapsible **Your Data** last.
- Choosing a theme while Appearance is expanded keeps it expanded.
- Static assets use cache-busting version v0.4. All changes are isolated to this repository.

## Nutrition Lab v0.5 — Settings popup

- Settings now opens as a modal overlay, retaining the Home, Scan, My Foods or Targets page underneath.
- APP PREFERENCES appears on the modal header's top left; a close X appears on the top right.
- The settings content scrolls independently within the modal on small screens; background interaction and page scrolling are suspended while it is open.
- Appearance remains collapsed by default; About this prototype and Your Data stay expanded and do not have disclosure arrows.
- Close Settings using X, Escape or the backdrop; the current page remains active. Selecting a theme updates the modal in place without collapsing Appearance or resetting the scroll position.
- The previous dedicated Settings route and Back button are no longer used. The original local nutrition data and unrelated projects are unchanged.

## Nutrition Lab v0.7 — Barcode camera and meal logging

- **Scan Barcode** opens an immersive in-app rear-camera preview on HTTPS. EAN-13/EAN-8/UPC-A/UPC-E barcodes are decoded continuously by html5-qrcode and the first valid barcode is looked up automatically. No separate shutter press or saved photograph is needed; iOS websites do not embed the native Camera app.
- The Home "Scan barcode" shortcut opens the camera immediately; the Scan tab also has a scan button. Camera closes on detection, cancel, dismissal or when the app is backgrounded. Manual barcode entry remains as fallback.
- Found products open a details sheet with serving editor first (before the longer nutrition breakdown). Both liquids and foods have minus/plus controls, a numeric amount, a unit selector, and meal selector (Breakfast, Lunch, Dinner, Snacks, Liquids). Buttons offer **Cancel / Discard** and **Log**.
- Food measurements: g, kg, oz, lb and serving. Liquid measurements: ml, cl, L, UK and US fl oz, metric cup, UK pint, tablespoon, teaspoon and serving. Values are converted to g or ml internally for correct nutrient calculations; selected units are retained as display metadata.
- Products with volume in their serving or package quantity, or beverage categories, default to liquid entry and the Liquids meal. Water logging and historic entries continue to work, and existing saved data is preserved.
- Actual rear-camera scanning requires a physical device and camera permission. Scanner and logging logic has passed simulated tests; iPhone camera hardware has not been tested remotely.
