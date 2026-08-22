# Text-o-Matic v3.0.3

## v3.0.3 changes

- Simplified Step 2 contact-card setup: the **Offer “Save contact”** checkbox is always visible, and checking it reveals the contact-field mappings directly.
- Removed the extra collapsed Contact card disclosure so enabling the feature now takes one click instead of two.

## v3.0.2 changes

- Version display now automatically appends `-dev` on `text-o-matic-dev.nickspeelman.com`; production continues to display the normal version number.
- Contact-card **First name** and **Last name** now default from the Step 2 display-name fields.
- Recognizable first/given and last/family/surname headers are assigned appropriately even if their display order differs.
- If the display-name fields change, those contact-name defaults follow them until the user manually changes the corresponding contact-card dropdown.

## v3.0.1 changes

- Added one-active-session queue persistence in IndexedDB.
- An unfinished texting queue now resumes automatically when Text-o-Matic is reopened on the same device.
- Queue position, recipient statuses, and the most recently messaged recipient are preserved.
- Session state is saved before launching the messaging app, so closing the browser/PWA after sending does not lose the next position or Save contact target.
- The active session remains resumable until Finish is explicitly used.

## v3.0.0 changes

- Added an optional, collapsed Contact card setup to Step 2.
- Contact cards can map first name, last name, email, organization, title/role, and notes; phone comes from the existing phone mapping.
- Replaced the sequential texting card with a queue showing Just messaged, Up now, and Next.
- Added Message & next, Skip & next, Back, Forward, and a full queue browser with persistent Messaged/Skipped/Not contacted statuses.
- The most recently messaged recipient remains available with Save contact after returning from the messaging app.
- Contact cards are generated locally as vCard (.vcf) files and are included in device-transfer payloads when enabled.
- Bumped the service-worker app version to 3.0.0.


- Reframed QR handoff as Device Transfer and added explicit privacy/verifiability explanations.


A static, client-side web app for preparing personalized SMS or WhatsApp messages from pasted data, CSV files, or Excel workbooks.


## v2.0.1 changes

- Strengthened the Welcome/About privacy section around verifiable claims rather than reassurance alone.
- Added direct verification options: work offline after the app reports **Offline ready**, inspect the open-source repository, or watch browser network traffic.
- Added an in-app **How to inspect network traffic** guide with Chrome/Edge/Firefox developer-tools instructions and a clear explanation of what normal site/analytics traffic may still appear.
- Added environment-aware source-code links: the dev site points to the dev repository and production points to the production repository.
- Expanded the Privacy screen to include the same verification options.
- Bumped the service-worker app version to `2.0.1` so deployed clients pick up the update.

## v1.1 changes

- Added WhatsApp as a first-class messaging option alongside SMS / the device's default texting app.
- Step 5 now asks which messaging app to use before choosing this device or a QR handoff.
- WhatsApp uses the existing mapped phone-number column and opens a `wa.me` click-to-chat link with the prepared message filled in.
- The selected messaging app is included in QR transfer payloads, so cross-device handoff preserves the intended send method.
- The receiving device shows which messaging app was transferred and starts the same sequential recipient queue with that app.
- Added a **Change app** control in the sequential sending view.
- Generalized message-open usage counting while preserving previous SMS usage totals.
- Updated privacy language to explain the boundary between Text-o-Matic's local processing and handing a recipient/message to WhatsApp.
- Bumped the service-worker app version to `1.1.0`.

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
- Continue on the current device via SMS links or WhatsApp click-to-chat links
- Client-side QR transfer, including multi-QR transfers for large lists
- Receiving device accumulates QR chunks in IndexedDB
- Local usage counters in IndexedDB
- Donation prompt hooks at restrained usage milestones
- Contact/feedback link to `nick@nickspeelman.com`

## Privacy model

Text-o-Matic processes imported phone numbers, names, merge fields, and message text in the user's browser. That contact/message payload is not uploaded to Text-o-Matic and is not intentionally sent to Cloudflare Web Analytics. Cloudflare Web Analytics is used only for basic aggregate site-usage and performance measurement.

For QR handoff, prepared recipient/message data is encoded directly into the QR code. The receiving browser reads the encoded payload from the QR URL fragment and reconstructs the list locally. URL fragments are not included in the normal HTTP request for the page.

The QR generator is loaded from pinned `qrcodejs@1.0.0` on jsDelivr. Excel parsing uses the full SheetJS Community Edition browser build `0.20.3` from the SheetJS CDN. These are static JavaScript asset requests; imported contact/message/workbook data is not included in those requests. The service worker runtime-caches both libraries after they have been fetched while the PWA is controlling the page.

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
