# Text-o-Matic pageview Worker

This folder is deliberately committed with the rest of Text-o-Matic so the small
server-side portion of the privacy model is public too.

## What the Worker accepts

- `POST /view` from the configured Text-o-Matic origin.
- The request body is never read.
- Production increments one row in D1 for the current America/New_York calendar day.
- Development has no D1 binding and therefore does not store test pageviews.
- `GET /health` is read-only and exposes the deployed Git commit tag and Cloudflare Worker version.

## Persistent schema

See `schema.sql`. The only application-managed persistent table is:

- `day TEXT PRIMARY KEY`
- `views INTEGER NOT NULL`

