/**
 * Minimal SEC EDGAR client.
 * - Sends the mandatory User-Agent (SEC returns 403 without it).
 * - Throttles to ~8 req/s per instance (SEC limit is 10 req/s).
 * - Retries on 429 / 5xx with exponential backoff.
 */

const MIN_INTERVAL_MS = 125;
let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  const next = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
  });
  queue = next.catch(() => {});
  return next;
}

function userAgent(): string {
  const ua = process.env.SEC_USER_AGENT;
  if (!ua || !ua.includes("@")) {
    throw new Error("SEC_USER_AGENT env var must be set to '<app name> <contact email>'");
  }
  return ua;
}

export class SecHttpError extends Error {
  constructor(public status: number, public url: string) {
    super(`SEC request failed (${status}): ${url}`);
  }
}

export async function secFetchJson<T>(url: string, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    await throttle();
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || i >= attempts - 1) throw new SecHttpError(res.status, url);
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
}

export const padCik = (cik: string | number) => String(cik).padStart(10, "0");

// ───────────── Types (only the fields we use) ─────────────

export interface SecFact {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number | null;
  fp: string | null;
  form: string;
  filed: string;
  frame?: string;
}

export interface CompanyFacts {
  cik: number;
  entityName: string;
  facts: Record<string, Record<string, { label?: string; units: Record<string, SecFact[]> }>>;
}

export interface Submissions {
  cik: string;
  name: string;
  sic: string;
  sicDescription: string;
  tickers: string[];
  exchanges: string[];
  fiscalYearEnd: string; // "0930"
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      form: string[];
      reportDate: string[];
    };
  };
}

export const getCompanyFacts = (cik: string) =>
  secFetchJson<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padCik(cik)}.json`);

export const getSubmissions = (cik: string) =>
  secFetchJson<Submissions>(`https://data.sec.gov/submissions/CIK${padCik(cik)}.json`);

/** Periodic financial report forms that change companyfacts. */
export const PERIODIC_FORMS = new Set(["10-K", "10-Q", "10-K/A", "10-Q/A", "20-F", "20-F/A", "40-F", "40-F/A", "10-KT", "10-QT"]);

export function latestPeriodicFiling(s: Submissions): { accession: string; filingDate: string; form: string } | null {
  const r = s.filings.recent;
  // `recent` is ordered newest first.
  for (let i = 0; i < r.form.length; i++) {
    if (PERIODIC_FORMS.has(r.form[i])) {
      return { accession: r.accessionNumber[i], filingDate: r.filingDate[i], form: r.form[i] };
    }
  }
  return null;
}

// ───────────── Ticker → CIK (in-memory, refreshed daily per instance) ─────────────

let tickerMap: Map<string, { cik: string; title: string }> | null = null;
let tickerMapAt = 0;

export function normalizeTicker(t: string): string {
  return t.trim().toUpperCase().replace(/\./g, "-");
}

export async function lookupTicker(ticker: string): Promise<{ cik: string; title: string } | null> {
  if (!tickerMap || Date.now() - tickerMapAt > 24 * 3600_000) {
    const raw = await secFetchJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
      "https://www.sec.gov/files/company_tickers.json",
    );
    const m = new Map<string, { cik: string; title: string }>();
    for (const v of Object.values(raw)) m.set(normalizeTicker(v.ticker), { cik: padCik(v.cik_str), title: v.title });
    tickerMap = m;
    tickerMapAt = Date.now();
  }
  return tickerMap.get(normalizeTicker(ticker)) ?? null;
}
