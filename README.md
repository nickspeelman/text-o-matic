# Text-o-Matic v0.1.13

A static, client-side web app for preparing personalized SMS messages from pasted data, CSV files, or Excel workbooks.


## v0.1.13 changes

- Added an **Offline ready** status in the footer.
- The service worker now proactively caches the pinned QR-code and SheetJS libraries while online, in addition to the core app shell.
- Once the footer reports **Offline ready**, CSV/Excel import, message preparation, QR generation, QR reconstruction, and local state are available without an internet connection.
- Cloudflare Web Analytics remains optional to operation and simply does not report while offline.
- Updated offline error messages to explain how to finish offline setup.
- Bumped the single-source service-worker version to `0.1.13`.

**Important:** the two third-party libraries are still fetched from their pinned upstream CDNs during initial online setup and then stored in the service-worker cache. They are not yet physically bundled into this ZIP. The readiness indicator only reports success after those files are actually cached.


## v0.1.12 changes

- Added a live display-name preview on the column-mapping screen.
- Added an ordered display-name field list with explicit **↑ Earlier** and **↓ Later** controls.
- Display-name order is preserved independently of the spreadsheet column order and is used everywhere recipients are labeled.
- Bumped the single-source service-worker version to `0.1.12`.

## Core features

- First-run instructions with a "don't show again" preference
- Five-step wizard: Your list → Columns → Message → Review → Text
- Paste phone lists / CSV-like text or upload CSV, `.xls`, or `.xlsx`
- Column mapping for phone number, display name, merge fields, and ignored fields
- `{{Merge Field}}` message templates with live previews
- Review screen that groups missing merge fields
- Custom fallback templates for affected recipient groups
- Exclude or leave missing fields blank
- Continue texting on the current device via `sms:` links
- Client-side QR transfer, including multi-QR transfers for large lists
- Receiving device accumulates QR chunks in IndexedDB
- Local usage counters in IndexedDB
- Donation prompt hooks at restrained usage milestones
- Contact/feedback link to `nick@nickspeelman.com`

## Privacy model

Text-o-Matic processes imported phone numbers, names, merge fields, and message text in the user's browser. That contact/message payload is not uploaded to Text-o-Matic and is not intentionally sent to Cloudflare Web Analytics. Cloudflare Web Analytics is used only for basic aggregate site-usage and performance measurement.

For QR handoff, prepared recipient/message data is encoded directly into the QR code. The receiving browser reads the encoded payload from the QR URL fragment and reconstructs the list locally. URL fragments are not included in the normal HTTP request for the page.

The QR generator is loaded from pinned `qrcodejs@1.0.0` on jsDelivr. Excel parsing uses the full SheetJS Community Edition browser build `0.20.3` from the SheetJS CDN. These are static JavaScript asset requests; imported contact/message/workbook data is not included in those requests. The service worker runtime-caches both libraries after they have been fetched while the PWA is controlling the page.

## PWA icons you need to add

Place these files in `assets/icons/` with the exact names below:

- `favicon-16.png` — 16×16
- `favicon-32.png` — 32×32
- `apple-touch-icon.png` — 180×180
- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `icon-maskable-512.png` — 512×512, with extra padding for adaptive masks

The manifest already references the 192, 512, and maskable 512 files. The page already references the favicon and Apple-touch files. Until the PWA icons exist, browsers may not consider the app fully installable.

A copy of the generated logo is included at `assets/icons/source-logo.png` for resizing/reference.

### Optional SEO/share image

If you want a rich image when Text-o-Matic is shared on social sites, create a **1200×630** image named `assets/social-preview.png`. Once you know the production domain, add an absolute `og:image` / `twitter:image` URL for it in `index.html`.

## SEO deployment note

The build intentionally does **not** include a canonical URL or `og:url`, because those should use the final production URL. Once the domain/path is decided, add absolute canonical and Open Graph URL tags in `index.html`.

## PWA deployment requirements

Installable PWAs need to be served over HTTPS (or localhost during development). GitHub Pages is suitable because it serves over HTTPS.

The service worker precaches the core Text-o-Matic shell and runtime-caches the pinned QR-code library after it is requested. New releases should bump the cache name in `service-worker.js`.

## Run locally

```powershell
cd path\to\text_o_matic_v0_1_11
python -m http.server 8000
```

Then open `http://localhost:8000`.

For QR handoff testing, the page must be reachable by the phone, such as a deployed HTTPS site or a LAN-accessible development server.

## Before publishing

1. Add the six icon files listed above.
2. Replace `DONATE_URL` near the top of `app.js` when you have a donation destination.
3. Add the production canonical URL / `og:url` once the domain is known.
4. Optionally add a 1200×630 social preview image and corresponding absolute meta tags.
5. Test PWA installation and `sms:` link behavior on both iOS and Android.

## Contact

Questions, issues, or comments: `nick@nickspeelman.com`


## v0.1.6 notes

- Duplicate recipients are detected by normalized phone number. The first row is kept by default and later duplicates are excluded, with an override in Review.
- The column-mapping screen now explains what “Display name” controls.
- The Finish button clears the current working list/message and returns to Step 1 while retaining local preferences, mappings, and usage statistics.


## Privacy screen

The Welcome/About dialog links to a dedicated Privacy screen explaining local contact/message processing, QR device-to-device transfer, Cloudflare Web Analytics, local browser storage, and the privacy contact address.


## v0.1.10 Excel/PWA fix

- Excel uploads are detected by filename, MIME type, and binary file signature so `.xls`/`.xlsx` files cannot fall through to the CSV/plain-text parser.
- Multi-sheet workbooks show a worksheet chooser before column mapping.
- Same-origin PWA assets now use a network-first service-worker strategy, with cached files retained as an offline fallback, reducing mixed-version/stale-JavaScript behavior after deployments.
