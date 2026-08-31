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

## Production configuration

Before the first production Git deployment, edit `wrangler.production.jsonc` and
replace:

- `REPLACE_WITH_EXISTING_D1_DATABASE_NAME`
- `REPLACE_WITH_EXISTING_D1_DATABASE_ID`

with the name and ID of the existing D1 database already used by the production counter.

The D1 database ID is configuration metadata, not a credential. Access still requires
Cloudflare authorization.

## Cloudflare Workers Builds commands

Set the Cloudflare Worker project's **Root directory** to:

    worker

For the dev Worker (`text-o-matic-pageviews-dev`), use:

    npx wrangler deploy --config wrangler.dev.jsonc --tag "$WORKERS_CI_COMMIT_SHA"

For the production Worker (`text-o-matic-pageviews`), use:

    npx wrangler deploy --config wrangler.production.jsonc --tag "$WORKERS_CI_COMMIT_SHA"

The `--tag` value becomes the `CF_VERSION_METADATA.tag` exposed by `/health` and by
the `X-Text-O-Matic-Commit` response header.
