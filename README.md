# Text-o-Matic v0.1.4

A static, client-side web app for preparing personalized SMS messages from pasted data or CSV files.

## v0.1.4 changes

- Revised privacy language to explain that contact/message data is processed locally and is never uploaded to Text-o-Matic or sent to a server.
- QR-transfer copy now explains that data is encoded into the QR code and moved between devices without being uploaded to or exposed on the internet.
- Added a warning to treat transfer QR codes like the contact list itself and not share or save them.
- Incoming transfer payloads are removed from the current URL immediately after they are decoded.
- `service-worker.js` is now the single source of truth for the app version. Update only `APP_VERSION` there; the visible footer and Help version read it automatically.
- Bumped the build to `v0.1.4`.

## Core features

- First-run instructions with a "don't show again" preference
- Five-step wizard: Your list → Columns → Message → Review → Text
- Paste phone lists / CSV-like text or upload CSV
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

Text-o-Matic processes imported phone numbers, names, merge fields, and message text in the user's browser. The app does not upload that contact/message payload to Text-o-Matic or send it over the internet.

For QR handoff, prepared recipient/message data is encoded directly into the QR code. The receiving browser reads the encoded payload from the QR URL fragment and reconstructs the list locally. URL fragments are not included in the normal HTTP request for the page.

The QR generator is currently loaded from the pinned `qrcodejs@1.0.0` file on jsDelivr. This means the browser makes a normal request to jsDelivr for that JavaScript asset; the imported contact/message data is not included in that request. The service worker runtime-caches the QR library after it has been fetched while the PWA is controlling the page.

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
cd path\to\text_o_matic_v0_1_4
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
