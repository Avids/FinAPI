/**
 * Financial metrics & derived ratios.
 * Computed from normalized statement line items.
 */
import type { Financials, Period, PeriodType } from "./normalize";

export interface MetricPeriod {
  type: PeriodType;
  start?: string;
  end: string;
  value: number;
}

export interface MetricSeries {
  metric: string;
  unit: string;
  periods: MetricPeriod[];
}

function findSeries(financials: Financials, conceptName: string) {
  for (const group of [financials.income, financials.balance, financials.cashflow, financials.per_share]) {
    const s = group.find((item) => item.concept === conceptName);
    if (s) return s;
  }
  return null;
}

/** Map periods by `${unit}|${start ?? ""}|${end}` */
function indexFlowPeriods(financials: Financials, conceptName: string): Map<string, { period: Period; unit: string }> {
  const series = findSeries(financials, conceptName);
  const m = new Map<string, { period: Period; unit: string }>();
  if (!series) return m;
  for (const p of series.periods) {
    const key = `${series.unit}|${p.start ?? ""}|${p.end}`;
    m.set(key, { period: p, unit: series.unit });
  }
  return m;
}

/** Map periods by `${unit}|${end}` for balance sheet snapshot metrics */
function indexInstantPeriods(financials: Financials, conceptName: string): Map<string, { period: Period; unit: string }> {
  const series = findSeries(financials, conceptName);
  const m = new Map<string, { period: Period; unit: string }>();
  if (!series) return m;
  for (const p of series.periods) {
    const key = `${series.unit}|${p.end}`;
    m.set(key, { period: p, unit: series.unit });
  }
  return m;
}

export function buildMetrics(financials: Financials): MetricSeries[] {
  const out: MetricSeries[] = [];

  // ───────────────────────── 1. Flow Ratios & Margins ─────────────────────────
  const revMap = indexFlowPeriods(financials, "Revenues");
  const gpMap = indexFlowPeriods(financials, "GrossProfit");
  const opIncMap = indexFlowPeriods(financials, "OperatingIncomeLoss");
  const netIncMap = indexFlowPeriods(financials, "NetIncomeLoss");
  const ocfMap = indexFlowPeriods(financials, "OperatingCashFlow");
  const capexMap = indexFlowPeriods(financials, "CapitalExpenditure");

  // Free Cash Flow: Operating Cash Flow - |Capital Expenditure|
  const fcfByUnit = new Map<string, MetricPeriod[]>();
  for (const [key, { period: ocf, unit }] of ocfMap) {
    const capex = capexMap.get(key)?.period;
    if (capex) {
      const fcfVal = ocf.value - Math.abs(capex.value);
      let list = fcfByUnit.get(unit);
      if (!list) fcfByUnit.set(unit, (list = []));
      list.push({
        type: ocf.type,
        ...(ocf.start ? { start: ocf.start } : {}),
        end: ocf.end,
        value: Math.round(fcfVal),
      });
    }
  }
  for (const [unit, periods] of fcfByUnit) {
    periods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "FreeCashFlow", unit, periods });
  }

  // Margins: Gross Margin, Operating Margin, Net Margin
  const gmPeriods: MetricPeriod[] = [];
  const omPeriods: MetricPeriod[] = [];
  const nmPeriods: MetricPeriod[] = [];

  for (const [key, { period: rev }] of revMap) {
    if (rev.value === 0) continue;

    const gp = gpMap.get(key)?.period;
    if (gp) {
      gmPeriods.push({
        type: rev.type,
        ...(rev.start ? { start: rev.start } : {}),
        end: rev.end,
        value: Number((gp.value / rev.value).toFixed(4)),
      });
    }

    const op = opIncMap.get(key)?.period;
    if (op) {
      omPeriods.push({
        type: rev.type,
        ...(rev.start ? { start: rev.start } : {}),
        end: rev.end,
        value: Number((op.value / rev.value).toFixed(4)),
      });
    }

    const ni = netIncMap.get(key)?.period;
    if (ni) {
      nmPeriods.push({
        type: rev.type,
        ...(rev.start ? { start: rev.start } : {}),
        end: rev.end,
        value: Number((ni.value / rev.value).toFixed(4)),
      });
    }
  }

  if (gmPeriods.length) {
    gmPeriods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "GrossMargin", unit: "ratio", periods: gmPeriods });
  }
  if (omPeriods.length) {
    omPeriods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "OperatingMargin", unit: "ratio", periods: omPeriods });
  }
  if (nmPeriods.length) {
    nmPeriods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "NetMargin", unit: "ratio", periods: nmPeriods });
  }

  // ───────────────────────── 2. Balance Sheet Metrics ─────────────────────────
  const currAssetsMap = indexInstantPeriods(financials, "AssetsCurrent");
  const currLiabMap = indexInstantPeriods(financials, "LiabilitiesCurrent");
  const cashMap = indexInstantPeriods(financials, "CashAndCashEquivalents");
  const stInvMap = indexInstantPeriods(financials, "ShortTermInvestments");

  // Working Capital & Current Ratio
  const wcByUnit = new Map<string, MetricPeriod[]>();
  const crPeriods: MetricPeriod[] = [];

  for (const [key, { period: ca, unit }] of currAssetsMap) {
    const cl = currLiabMap.get(key)?.period;
    if (cl) {
      let wcList = wcByUnit.get(unit);
      if (!wcList) wcByUnit.set(unit, (wcList = []));
      wcList.push({
        type: ca.type,
        end: ca.end,
        value: Math.round(ca.value - cl.value),
      });

      if (cl.value !== 0) {
        crPeriods.push({
          type: ca.type,
          end: ca.end,
          value: Number((ca.value / cl.value).toFixed(2)),
        });
      }
    }
  }

  for (const [unit, periods] of wcByUnit) {
    periods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "WorkingCapital", unit, periods });
  }
  if (crPeriods.length) {
    crPeriods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "CurrentRatio", unit: "ratio", periods: crPeriods });
  }

  // Total Debt & Net Debt
  const debtComponents = [
    indexInstantPeriods(financials, "ShortTermDebt"),
    indexInstantPeriods(financials, "LongTermDebtCurrent"),
    indexInstantPeriods(financials, "LongTermDebt"),
    indexInstantPeriods(financials, "OperatingLeaseLiabilityCurrent"),
    indexInstantPeriods(financials, "OperatingLeaseLiabilityNoncurrent"),
    indexInstantPeriods(financials, "FinanceLeaseLiabilityCurrent"),
    indexInstantPeriods(financials, "FinanceLeaseLiabilityNoncurrent"),
  ];

  // Collect all unique balance sheet snapshot keys
  const allSnapshotKeys = new Set<string>();
  for (const m of debtComponents) {
    for (const k of m.keys()) allSnapshotKeys.add(k);
  }

  const totalDebtByUnit = new Map<string, MetricPeriod[]>();
  const netDebtByUnit = new Map<string, MetricPeriod[]>();

  for (const key of allSnapshotKeys) {
    const [unit, end] = key.split("|");
    let sumDebt = 0;
    let hasDebt = false;
    let type: PeriodType = "FY";

    for (const comp of debtComponents) {
      const hit = comp.get(key);
      if (hit) {
        sumDebt += hit.period.value;
        hasDebt = true;
        type = hit.period.type;
      }
    }

    if (hasDebt) {
      let tdList = totalDebtByUnit.get(unit);
      if (!tdList) totalDebtByUnit.set(unit, (tdList = []));
      tdList.push({ type, end, value: Math.round(sumDebt) });

      // Cash + ST Investments
      const cash = cashMap.get(key)?.period.value ?? 0;
      const stInv = stInvMap.get(key)?.period.value ?? 0;
      const netDebtVal = sumDebt - (cash + stInv);

      let ndList = netDebtByUnit.get(unit);
      if (!ndList) netDebtByUnit.set(unit, (ndList = []));
      ndList.push({ type, end, value: Math.round(netDebtVal) });
    }
  }

  for (const [unit, periods] of totalDebtByUnit) {
    periods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "TotalDebt", unit, periods });
  }

  for (const [unit, periods] of netDebtByUnit) {
    periods.sort((a, b) => a.end.localeCompare(b.end));
    out.push({ metric: "NetDebt", unit, periods });
  }

  return out;
}
