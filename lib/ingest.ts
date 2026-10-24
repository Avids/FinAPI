/**
 * Fetch from SEC and write to Turso. Concurrency-safe via a per-company lock column.
 */
import { ready, getCompanyByCik, type FactRow } from "./db";
import { getCompanyFacts, getSubmissions, latestPeriodicFiling, SecHttpError } from "./sec";
import { extractFacts, maxFiled } from "./normalize";

const LOCK_TTL_MS = 5 * 60_000; // longer than Vercel Hobby's 300s max duration
const ROWS_PER_INSERT = 200;

const nowIso = () => new Date().toISOString();

export async function ensureCompany(cik: string, ticker: string, name: string | null): Promise<void> {
  const c = await ready();
  await c.execute({
    sql: "INSERT OR IGNORE INTO companies (cik, ticker, name) VALUES (?, ?, ?)",
    args: [cik, ticker, name],
  });
}

async function acquireLock(cik: string): Promise<boolean> {
  const c = await ready();
  const r = await c.execute({
    sql: `UPDATE companies SET refresh_lock = ?
          WHERE cik = ? AND (refresh_lock IS NULL OR refresh_lock < ?)`,
    args: [nowIso(), cik, new Date(Date.now() - LOCK_TTL_MS).toISOString()],
  });
  return r.rowsAffected === 1;
}

async function releaseLock(cik: string): Promise<void> {
  const c = await ready();
  await c.execute({ sql: "UPDATE companies SET refresh_lock = NULL WHERE cik = ?", args: [cik] });
}

async function upsertFacts(cik: string, rows: FactRow[]): Promise<void> {
  if (rows.length === 0) return;
  const c = await ready();
  const stmts = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT);
    const args: (string | number | null)[] = [];
    for (const r of chunk) {
      args.push(cik, r.tag, r.unit, r.period_start, r.period_end, r.value, r.fy, r.fp, r.form, r.filed, r.accn, r.frame);
    }
    stmts.push({
      sql: `INSERT INTO facts (cik, tag, unit, period_start, period_end, value, fy, fp, form, filed, accn, frame)
            VALUES ${chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?)").join(",")}
            ON CONFLICT (cik, tag, unit, period_start, period_end) DO UPDATE SET
              value = excluded.value, fy = excluded.fy, fp = excluded.fp, form = excluded.form,
              filed = excluded.filed, accn = excluded.accn, frame = excluded.frame
            WHERE excluded.filed > facts.filed OR (excluded.filed = facts.filed AND excluded.accn > facts.accn)`,
      args,
    });
  }
  await c.batch(stmts, "write");
}

export type RefreshResult =
  | { status: "locked" }
  | { status: "unchanged" }
  | { status: "updated"; rowsWritten: number; latestFilingDate: string | null }
  | { status: "error"; error: string };

/**
 * Check SEC for a new periodic filing; if there is one (or we have no data yet), download
 * companyfacts and upsert only facts filed since our last refresh.
 */
export async function refreshCompany(cik: string): Promise<RefreshResult> {
  if (!(await acquireLock(cik))) return { status: "locked" };
  const c = await ready();
  try {
    const company = await getCompanyByCik(cik);
    const subs = await getSubmissions(cik);
    const latest = latestPeriodicFiling(subs);
    const meta = [subs.name, subs.sic || null, subs.sicDescription || null, subs.fiscalYearEnd || null];

    if (company?.refreshed_at && (!latest || latest.accession === company.latest_accession)) {
      await c.execute({
        sql: `UPDATE companies SET name = ?, sic = ?, sic_description = ?, fiscal_year_end = ?,
              checked_at = ?, last_error = NULL WHERE cik = ?`,
        args: [...meta, nowIso(), cik],
      });
      return { status: "unchanged" };
    }

    let rows: FactRow[] = [];
    try {
      const cf = await getCompanyFacts(cik);
      rows = extractFacts(cf, company?.max_filed ?? null);
    } catch (e) {
      // 404 = company has no XBRL financial data (e.g. some funds / very old filers).
      if (!(e instanceof SecHttpError && e.status === 404)) throw e;
    }
    await upsertFacts(cik, rows);

    const newMax = [company?.max_filed ?? null, maxFiled(rows)].filter(Boolean).sort().pop() ?? null;
    const now = nowIso();
    await c.execute({
      sql: `UPDATE companies SET name = ?, sic = ?, sic_description = ?, fiscal_year_end = ?,
            latest_accession = ?, latest_filing_date = ?, max_filed = ?,
            refreshed_at = ?, checked_at = ?, last_error = NULL WHERE cik = ?`,
      args: [...meta, latest?.accession ?? null, latest?.filingDate ?? null, newMax, now, now, cik],
    });
    return { status: "updated", rowsWritten: rows.length, latestFilingDate: latest?.filingDate ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await c.execute({ sql: "UPDATE companies SET last_error = ? WHERE cik = ?", args: [msg.slice(0, 500), cik] }).catch(() => {});
    return { status: "error", error: msg };
  } finally {
    await releaseLock(cik).catch(() => {});
  }
}
