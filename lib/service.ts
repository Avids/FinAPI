import { getCikForTicker, getCompanyByCik, saveTicker, type CompanyRow } from "./db";
import { ensureCompany } from "./ingest";
import { lookupTicker, normalizeTicker } from "./sec";

const TICKER_RE = /^[A-Z0-9-]{1,10}$/;

export type Resolve =
  | { ok: true; ticker: string; company: CompanyRow }
  | { ok: false; status: 400 | 404; error: string };

/** ticker -> company row (creating the row and ticker mapping on first sight). */
export async function resolveCompany(rawTicker: string): Promise<Resolve> {
  const ticker = normalizeTicker(decodeURIComponent(rawTicker));
  if (!TICKER_RE.test(ticker)) return { ok: false, status: 400, error: "invalid ticker" };

  let cik = await getCikForTicker(ticker);
  if (!cik) {
    const hit = await lookupTicker(ticker);
    if (!hit) return { ok: false, status: 404, error: `ticker ${ticker} not found in SEC EDGAR` };
    cik = hit.cik;
    await ensureCompany(cik, ticker, hit.title);
    await saveTicker(ticker, cik);
  }
  const company = await getCompanyByCik(cik);
  if (!company) {
    await ensureCompany(cik, ticker, null);
    return { ok: true, ticker, company: (await getCompanyByCik(cik))! };
  }
  return { ok: true, ticker, company };
}
