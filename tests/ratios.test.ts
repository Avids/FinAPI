import { describe, expect, it } from "vitest";
import { buildMetrics } from "../lib/ratios";
import type { Financials } from "../lib/normalize";

describe("buildMetrics", () => {
  const fin: Financials = {
    income: [
      {
        concept: "Revenues",
        unit: "USD",
        periods: [{ type: "FY", start: "2023-10-01", end: "2024-09-28", value: 400000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "GrossProfit",
        unit: "USD",
        periods: [{ type: "FY", start: "2023-10-01", end: "2024-09-28", value: 180000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "OperatingIncomeLoss",
        unit: "USD",
        periods: [{ type: "FY", start: "2023-10-01", end: "2024-09-28", value: 120000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "NetIncomeLoss",
        unit: "USD",
        periods: [{ type: "FY", start: "2023-10-01", end: "2024-09-28", value: 100000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
    ],
    balance: [
      {
        concept: "AssetsCurrent",
        unit: "USD",
        periods: [{ type: "FY", end: "2024-09-28", value: 150000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "LiabilitiesCurrent",
        unit: "USD",
        periods: [{ type: "FY", end: "2024-09-28", value: 100000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "LongTermDebt",
        unit: "USD",
        periods: [{ type: "FY", end: "2024-09-28", value: 80000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "OperatingLeaseLiabilityCurrent",
        unit: "USD",
        periods: [{ type: "FY", end: "2024-09-28", value: 5000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "CashAndCashEquivalents",
        unit: "USD",
        periods: [{ type: "FY", end: "2024-09-28", value: 30000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
    ],
    cashflow: [
      {
        concept: "OperatingCashFlow",
        unit: "USD",
        periods: [{ type: "FY", start: "2023-10-01", end: "2024-09-28", value: 110000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
      {
        concept: "CapitalExpenditure",
        unit: "USD",
        periods: [{ type: "FY", start: "2023-10-01", end: "2024-09-28", value: 10000, fy: 2024, fp: "FY", form: "10-K", filed: "2024-11-01", accn: "a", tag: "t" }],
      },
    ],
    per_share: [],
  };

  it("calculates FreeCashFlow", () => {
    const metrics = buildMetrics(fin);
    const fcf = metrics.find((m) => m.metric === "FreeCashFlow")!;
    expect(fcf).toBeDefined();
    expect(fcf.periods[0].value).toBe(100000); // 110000 - 10000
    expect(fcf.unit).toBe("USD");
  });

  it("calculates Margins accurately", () => {
    const metrics = buildMetrics(fin);
    const gm = metrics.find((m) => m.metric === "GrossMargin")!;
    expect(gm.periods[0].value).toBe(0.45); // 180000 / 400000

    const om = metrics.find((m) => m.metric === "OperatingMargin")!;
    expect(om.periods[0].value).toBe(0.3); // 120000 / 400000

    const nm = metrics.find((m) => m.metric === "NetMargin")!;
    expect(nm.periods[0].value).toBe(0.25); // 100000 / 400000
  });

  it("calculates WorkingCapital and CurrentRatio", () => {
    const metrics = buildMetrics(fin);
    const wc = metrics.find((m) => m.metric === "WorkingCapital")!;
    expect(wc.periods[0].value).toBe(50000); // 150000 - 100000

    const cr = metrics.find((m) => m.metric === "CurrentRatio")!;
    expect(cr.periods[0].value).toBe(1.5); // 150000 / 100000
  });

  it("calculates TotalDebt and NetDebt with lease inclusion", () => {
    const metrics = buildMetrics(fin);
    const td = metrics.find((m) => m.metric === "TotalDebt")!;
    expect(td.periods[0].value).toBe(85000); // 80000 LT Debt + 5000 Current Lease

    const nd = metrics.find((m) => m.metric === "NetDebt")!;
    expect(nd.periods[0].value).toBe(55000); // 85000 - 30000 Cash
  });
});
