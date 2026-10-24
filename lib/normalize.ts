/**
 * Pure transforms (no I/O) — unit tested in tests/normalize.test.ts.
 *  1. extractFacts: SEC companyfacts JSON -> deduped rows for tracked tags.
 *  2. buildFinancials: stored rows -> API response grouped by statement.
 */
import { CONCEPTS, TRACKED_TAGS, type ConceptDef, type Group } from "./concepts";
import type { CompanyFacts } from "./sec";
import type { FactRow } from "./db";

// ───────────────────────── 1. Extract ─────────────────────────

/**
 * Keep one row per (tag, unit, start, end): the most recently filed value (captures restatements).
 * If `minFiled` is given, only facts filed on/after that date are returned (incremental refresh).
 */
export function extractFacts(cf: CompanyFacts, minFiled?: string | null): FactRow[] {
  const best = new Map<string, FactRow>();
  for (const [taxonomy, concepts] of Object.entries(cf.facts ?? {})) {
    for (const [concept, body] of Object.entries(concepts)) {
      const tag = `${taxonomy}:${concept}`;
      if (!TRACKED_TAGS.has(tag)) continue;
      for (const [unit, facts] of Object.entries(body.units ?? {})) {
        for (const f of facts) {
          if (minFiled && f.filed < minFiled) continue;
          if (typeof f.val !== "number" || !f.end || !f.filed) continue;
          const start = f.start ?? "";
          const key = `${tag}|${unit}|${start}|${f.end}`;
          const prev = best.get(key);
          if (prev && (prev.filed > f.filed || (prev.filed === f.filed && prev.accn >= f.accn))) continue;
          best.set(key, {
            tag,
            unit,
            period_start: start,
            period_end: f.end,
            value: f.val,
            fy: f.fy ?? null,
            fp: f.fp ?? null,
            form: f.form ?? null,
            filed: f.filed,
            accn: f.accn,
            frame: f.frame ?? null,
          });
        }
      }
    }
  }
  return [...best.values()];
}

export function maxFiled(rows: FactRow[]): string | null {
  let m: string | null = null;
  for (const r of rows) if (!m || r.filed > m) m = r.filed;
  return m;
}

// ───────────────────────── 2. Build response ─────────────────────────

export type PeriodType = "FY" | "Q" | "YTD" | "OTHER";
export type PeriodFilter = "annual" | "quarterly" | "all";

export interface Period {
  type: PeriodType;
  start?: string;
  end: string;
  value: number;
  fy: number | null;
  fp: string | null;
  form: string | null;
  filed: string;
  accn: string;
  tag: string;
}

export interface ConceptSeries {
  concept: string;
  unit: string;
  periods: Period[];
}

export type Financials = Record<Group, ConceptSeries[]>;

const DAY = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

/** Is `end` (YYYY-MM-DD) within ±10 days of the fiscal-year-end month/day ("MMDD")? */
export function isFiscalYearEnd(end: string, fye: string | null): boolean {
  if (!fye || fye.length !== 4) return end.slice(5) === "12-31";
  const year = Number(end.slice(0, 4));
  const mm = fye.slice(0, 2);
  const dd = fye.slice(2);
  for (const y of [year - 1, year, year + 1]) {
    const fyeDate = Date.parse(`${y}-${mm}-${dd}`);
    if (!Number.isNaN(fyeDate) && Math.abs(Date.parse(end) - fyeDate) <= 10 * DAY) return true;
  }
  return false;
}

export function classify(row: Pick<FactRow, "period_start" | "period_end">, fye: string | null): PeriodType {
  if (!row.period_start) return isFiscalYearEnd(row.period_end, fye) ? "FY" : "Q"; // instant (balance sheet)
  const d = daysBetween(row.period_start, row.period_end);
  if (d >= 350 && d <= 380) return "FY";
  if (d >= 80 && d <= 100) return "Q";
  if (d >= 170 && d <= 280) return "YTD";
  return "OTHER";
}

function keep(type: PeriodType, filter: PeriodFilter): boolean {
  if (filter === "all") return true;
  if (filter === "annual") return type === "FY";
  // quarterly: quarterly flows + every balance-sheet date (incl. year end)
  return type === "Q";
}

export interface BuildOptions {
  fiscalYearEnd: string | null;
  period?: PeriodFilter;
  fromYear?: number;
  concepts?: ConceptDef[];
}

export function buildFinancials(rows: FactRow[], opts: BuildOptions): Financials {
  const period = opts.period ?? "all";
  const defs = opts.concepts ?? CONCEPTS;
  const out: Financials = { income: [], balance: [], cashflow: [], per_share: [] };

  // Index rows by tag for quick lookup.
  const byTag = new Map<string, FactRow[]>();
  for (const r of rows) {
    const list = byTag.get(r.tag);
    if (list) list.push(r);
    else byTag.set(r.tag, [r]);
  }

  for (const def of defs) {
    // unit -> periodKey -> Period (first tag in priority order wins)
    const byUnit = new Map<string, Map<string, Period>>();
    for (const tag of def.tags) {
      for (const r of byTag.get(tag) ?? []) {
        const type = classify(r, opts.fiscalYearEnd);
        // Balance-sheet year-end values also belong in the quarterly view.
        const instant = !r.period_start;
        const passes = keep(type, period) || (instant && period === "quarterly");
        if (!passes) continue;
        if (opts.fromYear && Number(r.period_end.slice(0, 4)) < opts.fromYear) continue;
        let periods = byUnit.get(r.unit);
        if (!periods) byUnit.set(r.unit, (periods = new Map()));
        const pk = `${r.period_start}|${r.period_end}`;
        if (periods.has(pk)) continue;
        periods.set(pk, {
          type,
          ...(r.period_start ? { start: r.period_start } : {}),
          end: r.period_end,
          value: r.value,
          fy: r.fy,
          fp: r.fp,
          form: r.form,
          filed: r.filed,
          accn: r.accn,
          tag,
        });
      }
    }
    for (const [unit, periods] of byUnit) {
      const sorted = [...periods.values()].sort((a, b) =>
        a.end === b.end ? (a.start ?? "").localeCompare(b.start ?? "") : a.end.localeCompare(b.end),
      );
      if (sorted.length) out[def.group].push({ concept: def.name, unit, periods: sorted });
    }
  }
  return out;
}
