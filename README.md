# Text List v0.1

A static, client-side web app for preparing personalized SMS messages from pasted data or CSV files.

## v0.1 features

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
- Discreet `v0.1` marker in the footer and Help dialog

## Privacy model

List parsing, merge processing, review, message generation, transfer construction, and usage counters happen in the browser. There is no application backend.

The QR generator is currently loaded from a pinned jsDelivr CDN URL. It executes in the browser, but the page does make a request to jsDelivr to retrieve that JavaScript file. For a fully self-contained deployment, download `qrcodejs@1.0.0/qrcode.min.js`, store it in the project, and change the script tag in `index.html` to the local file.

## Run locally

Because browsers vary in their behavior when opening local `file://` pages, use a tiny static web server for testing:

```powershell
cd path\to\sms_wizard_v0_1
python -m http.server 8000
```

Then open:

`http://localhost:8000`

For QR handoff testing, the page must be reachable by the phone (for example, deploy to GitHub Pages or use a LAN-accessible development server).

## Before publishing

1. Pick the final product name and replace `Text List` if desired.
2. Replace `DONATE_URL` near the top of `app.js`.
3. Prefer vendoring `qrcode.min.js` locally for a fully self-contained build.
4. Test `sms:` link behavior on both iOS and Android.
