/**
 * Refresh policy:
 *  - After a successful DB update (`refreshed_at`), don't contact SEC for REFRESH_INTERVAL_DAYS (default 60).
 *  - Once that interval has passed, check SEC's submissions feed for a new 10-K/10-Q,
 *    at most once every RECHECK_HOURS (default 24) until a new filing shows up.
 */
import type { CompanyRow } from "./db";

const DAY = 86_400_000;
export const REFRESH_INTERVAL_DAYS = Number(process.env.REFRESH_INTERVAL_DAYS ?? 60);
export const RECHECK_HOURS = Number(process.env.RECHECK_HOURS ?? 24);

export type Freshness = "missing" | "fresh" | "due" | "recently-checked";

export function freshness(c: Pick<CompanyRow, "refreshed_at" | "checked_at">, now = Date.now()): Freshness {
  if (!c.refreshed_at) return "missing";
  if (now - Date.parse(c.refreshed_at) < REFRESH_INTERVAL_DAYS * DAY) return "fresh";
  if (c.checked_at && now - Date.parse(c.checked_at) < RECHECK_HOURS * 3600_000) return "recently-checked";
  return "due";
}

export function isStale(c: Pick<CompanyRow, "refreshed_at">, now = Date.now()): boolean {
  return !c.refreshed_at || now - Date.parse(c.refreshed_at) >= REFRESH_INTERVAL_DAYS * DAY;
}
