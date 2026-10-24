import { createClient, type Client } from "@libsql/client";
import { SCHEMA_STATEMENTS } from "./schema";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

export function db(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  }
  return client;
}

/** Ensures tables exist (once per server instance). */
export async function ready(): Promise<Client> {
  const c = db();
  if (!schemaReady) {
    schemaReady = c.batch(SCHEMA_STATEMENTS, "write").then(() => undefined);
    schemaReady.catch(() => (schemaReady = null));
  }
  await schemaReady;
  return c;
}

export interface CompanyRow {
  cik: string;
  ticker: string | null;
  name: string | null;
  sic: string | null;
  sic_description: string | null;
  fiscal_year_end: string | null;
  latest_accession: string | null;
  latest_filing_date: string | null;
  max_filed: string | null;
  refreshed_at: string | null;
  checked_at: string | null;
  refresh_lock: string | null;
  last_error: string | null;
  request_count: number;
}

export interface FactRow {
  tag: string;
  unit: string;
  period_start: string;
  period_end: string;
  value: number;
  fy: number | null;
  fp: string | null;
  form: string | null;
  filed: string;
  accn: string;
  frame: string | null;
}

export async function getCikForTicker(ticker: string): Promise<string | null> {
  const c = await ready();
  const r = await c.execute({ sql: "SELECT cik FROM tickers WHERE ticker = ?", args: [ticker] });
  return (r.rows[0]?.cik as string | undefined) ?? null;
}

export async function saveTicker(ticker: string, cik: string): Promise<void> {
  const c = await ready();
  await c.execute({ sql: "INSERT OR IGNORE INTO tickers (ticker, cik) VALUES (?, ?)", args: [ticker, cik] });
}

export async function getCompanyByCik(cik: string): Promise<CompanyRow | null> {
  const c = await ready();
  const r = await c.execute({ sql: "SELECT * FROM companies WHERE cik = ?", args: [cik] });
  return (r.rows[0] as unknown as CompanyRow) ?? null;
}

export async function getFacts(cik: string, tags: string[]): Promise<FactRow[]> {
  const c = await ready();
  if (tags.length === 0) return [];
  const placeholders = tags.map(() => "?").join(",");
  const r = await c.execute({
    sql: `SELECT tag, unit, period_start, period_end, value, fy, fp, form, filed, accn, frame
          FROM facts WHERE cik = ? AND tag IN (${placeholders})`,
    args: [cik, ...tags],
  });
  return r.rows as unknown as FactRow[];
}

export async function incrementRequestCount(cik: string): Promise<void> {
  const c = await ready();
  await c.execute({ sql: "UPDATE companies SET request_count = request_count + 1 WHERE cik = ?", args: [cik] });
}
