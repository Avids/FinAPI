/** Schema (idempotent). Kept dependency-free so scripts/migrate.ts can import it directly. */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS companies (
    cik                TEXT PRIMARY KEY,
    ticker             TEXT,
    name               TEXT,
    sic                TEXT,
    sic_description    TEXT,
    fiscal_year_end    TEXT,
    latest_accession   TEXT,
    latest_filing_date TEXT,
    max_filed          TEXT,
    refreshed_at       TEXT,
    checked_at         TEXT,
    refresh_lock       TEXT,
    last_error         TEXT,
    request_count      INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS facts (
    cik           TEXT NOT NULL,
    tag           TEXT NOT NULL,
    unit          TEXT NOT NULL,
    period_start  TEXT NOT NULL DEFAULT '',
    period_end    TEXT NOT NULL,
    value         REAL NOT NULL,
    fy            INTEGER,
    fp            TEXT,
    form          TEXT,
    filed         TEXT NOT NULL,
    accn          TEXT NOT NULL,
    frame         TEXT,
    PRIMARY KEY (cik, tag, unit, period_start, period_end)
  ) WITHOUT ROWID`,
  // Only tickers that have actually been requested (GOOG and GOOGL both map to one CIK).
  `CREATE TABLE IF NOT EXISTS tickers (
    ticker TEXT PRIMARY KEY,
    cik    TEXT NOT NULL
  )`,
  // User registration & API key management
  `CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT UNIQUE NOT NULL,
    api_key        TEXT UNIQUE NOT NULL,
    tier           TEXT NOT NULL DEFAULT 'free',
    daily_limit    INTEGER NOT NULL DEFAULT 20,
    total_requests INTEGER NOT NULL DEFAULT 0,
    last_ticker    TEXT,
    last_used_at   TEXT,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  // Daily request usage tracking for rate limiting
  `CREATE TABLE IF NOT EXISTS api_usage (
    api_key TEXT NOT NULL,
    day     TEXT NOT NULL,
    count   INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (api_key, day)
  ) WITHOUT ROWID`,
];
