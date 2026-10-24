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

export interface UserRow {
  id: string;
  name: string;
  email: string;
  api_key: string;
  tier: string;
  daily_limit: number;
  total_requests: number;
  last_ticker: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface AdminUserStats extends UserRow {
  requests_today: number;
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

// ───────────────────────── User & Rate Limit Management ─────────────────────────

export async function getUserByApiKey(apiKey: string): Promise<UserRow | null> {
  const c = await ready();
  const r = await c.execute({ sql: "SELECT * FROM users WHERE api_key = ?", args: [apiKey] });
  return (r.rows[0] as unknown as UserRow) ?? null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const c = await ready();
  const r = await c.execute({ sql: "SELECT * FROM users WHERE LOWER(email) = LOWER(?)", args: [email.trim()] });
  return (r.rows[0] as unknown as UserRow) ?? null;
}

export async function createUser(params: {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  dailyLimit?: number;
}): Promise<UserRow> {
  const c = await ready();
  const limit = params.dailyLimit ?? 20;
  await c.execute({
    sql: `INSERT INTO users (id, name, email, api_key, daily_limit) VALUES (?, ?, ?, ?, ?)`,
    args: [params.id, params.name.trim(), params.email.trim().toLowerCase(), params.apiKey, limit],
  });
  return (await getUserByApiKey(params.apiKey))!;
}

export async function getTodayUsage(apiKey: string, day: string): Promise<number> {
  const c = await ready();
  const r = await c.execute({
    sql: "SELECT count FROM api_usage WHERE api_key = ? AND day = ?",
    args: [apiKey, day],
  });
  return Number(r.rows[0]?.count ?? 0);
}

export async function recordApiUsage(apiKey: string, day: string, ticker?: string): Promise<void> {
  const c = await ready();
  await c.batch([
    {
      sql: `INSERT INTO api_usage (api_key, day, count) VALUES (?, ?, 1)
            ON CONFLICT (api_key, day) DO UPDATE SET count = count + 1`,
      args: [apiKey, day],
    },
    {
      sql: `UPDATE users SET
              total_requests = total_requests + 1,
              last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              last_ticker = COALESCE(?, last_ticker)
            WHERE api_key = ?`,
      args: [ticker ?? null, apiKey],
    },
  ], "write");
}

export async function getAllUsersWithUsage(day: string): Promise<AdminUserStats[]> {
  const c = await ready();
  const r = await c.execute({
    sql: `SELECT u.*, COALESCE(a.count, 0) AS requests_today
          FROM users u
          LEFT JOIN api_usage a ON u.api_key = a.api_key AND a.day = ?
          ORDER BY u.last_used_at DESC, u.created_at DESC`,
    args: [day],
  });
  return r.rows as unknown as AdminUserStats[];
}

export async function updateUserDailyLimit(userIdOrEmail: string, dailyLimit: number): Promise<boolean> {
  const c = await ready();
  const r = await c.execute({
    sql: `UPDATE users SET daily_limit = ? WHERE id = ? OR LOWER(email) = LOWER(?)`,
    args: [dailyLimit, userIdOrEmail, userIdOrEmail.toLowerCase().trim()],
  });
  return r.rowsAffected > 0;
}
