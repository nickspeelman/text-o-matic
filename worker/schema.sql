-- Text-o-Matic pageview counter persistent storage.
-- One row per calendar day; no per-visit rows or visitor fields.
CREATE TABLE IF NOT EXISTS daily_pageviews (
  day TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0
);
