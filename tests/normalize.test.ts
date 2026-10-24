import { describe, expect, it } from "vitest";
import { buildFinancials, classify, extractFacts, isFiscalYearEnd, maxFiled } from "../lib/normalize";
import { freshness } from "../lib/freshness";
import type { CompanyFacts } from "../lib/sec";

const cf: CompanyFacts = {
  cik: 320193,
  entityName: "Apple Inc.",
  facts: {
    "us-gaap": {
      SalesRevenueNet: {
        units: {
          USD: [
            { start: "2016-09-25", end: "2017-09-30", val: 229234, accn: "a1", fy: 2017, fp: "FY", form: "10-K", filed: "2017-11-03" },
          ],
        },
      },
      RevenueFromContractWithCustomerExcludingAssessedTax: {
        units: {
          USD: [
            // Same FY2017 period re-reported later (comparative) -> merged; preferred-tag rule applies at read time
            { start: "2016-09-25", end: "2017-09-30", val: 229234, accn: "a3", fy: 2019, fp: "FY", form: "10-K", filed: "2019-10-31" },
            { start: "2017-10-01", end: "2018-09-29", val: 265595, accn: "a2", fy: 2018, fp: "FY", form: "10-K", filed: "2018-11-05" },
            // Restated in a later filing -> later filed value wins
            { start: "2017-10-01", end: "2018-09-29", val: 265999, accn: "a3", fy: 2019, fp: "FY", form: "10-K", filed: "2019-10-31" },
            // Quarter and YTD
            { start: "2018-12-30", end: "2019-03-30", val: 58015, accn: "q2", fy: 2019, fp: "Q2", form: "10-Q", filed: "2019-05-01" },
            { start: "2018-09-30", end: "2019-03-30", val: 142325, accn: "q2", fy: 2019, fp: "Q2", form: "10-Q", filed: "2019-05-01" },
          ],
        },
      },
      Assets: {
        units: {
          USD: [
            { end: "2018-09-29", val: 365725, accn: "a2", fy: 2018, fp: "FY", form: "10-K", filed: "2018-11-05" },
            { end: "2019-03-30", val: 341998, accn: "q2", fy: 2019, fp: "Q2", form: "10-Q", filed: "2019-05-01" },
          ],
        },
      },
      OperatingLeaseLiabilityCurrent: {
        units: {
          USD: [{ end: "2019-03-30", val: 12000, accn: "q2", fy: 2019, fp: "Q2", form: "10-Q", filed: "2019-05-01" }],
        },
      },
      RevenueRemainingPerformanceObligation: {
        units: {
          USD: [{ end: "2019-03-30", val: 45000, accn: "q2", fy: 2019, fp: "Q2", form: "10-Q", filed: "2019-05-01" }],
        },
      },
      SomeUntrackedTag: {
        units: { USD: [{ end: "2019-03-30", val: 1, accn: "q2", fy: 2019, fp: "Q2", form: "10-Q", filed: "2019-05-01" }] },
      },
    },
  },
};

describe("extractFacts", () => {
  it("keeps tracked tags only and dedupes by latest filing", () => {
    const rows = extractFacts(cf);
    expect(rows.find((r) => r.tag.endsWith("SomeUntrackedTag"))).toBeUndefined();
    const fy18 = rows.filter((r) => r.tag.endsWith("RevenueFromContractWithCustomerExcludingAssessedTax") && r.period_end === "2018-09-29");
    expect(fy18).toHaveLength(1);
    expect(fy18[0].value).toBe(265999);
    expect(fy18[0].accn).toBe("a3");
    expect(maxFiled(rows)).toBe("2019-10-31");
  });

  it("supports incremental extraction by filed date", () => {
    const rows = extractFacts(cf, "2019-05-01");
    expect(rows.every((r) => r.filed >= "2019-05-01")).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("extracts and maps IFRS taxonomy tags for foreign private issuers", () => {
    const ifrsCf: CompanyFacts = {
      cik: 1046179,
      entityName: "TAIWAN SEMICONDUCTOR MANUFACTURING CO LTD",
      facts: {
        "ifrs-full": {
          Revenue: {
            units: {
              TWD: [
                { start: "2023-01-01", end: "2023-12-31", val: 2161735750000, accn: "tsm-2023", fy: 2023, fp: "FY", form: "20-F", filed: "2024-04-10" },
              ],
            },
          },
          ProfitLoss: {
            units: {
              TWD: [
                { start: "2023-01-01", end: "2023-12-31", val: 838497645000, accn: "tsm-2023", fy: 2023, fp: "FY", form: "20-F", filed: "2024-04-10" },
              ],
            },
          },
          CurrentLeaseLiabilities: {
            units: {
              TWD: [
                { end: "2023-12-31", val: 15000000000, accn: "tsm-2023", fy: 2023, fp: "FY", form: "20-F", filed: "2024-04-10" },
              ],
            },
          },
        },
      },
    };

    const rows = extractFacts(ifrsCf);
    expect(rows.length).toBe(3);

    const fin = buildFinancials(rows, { fiscalYearEnd: "1231", period: "annual" });
    const rev = fin.income.find((s) => s.concept === "Revenues")!;
    expect(rev).toBeDefined();
    expect(rev.periods[0].value).toBe(2161735750000);
    expect(rev.unit).toBe("TWD");

    const ni = fin.income.find((s) => s.concept === "NetIncomeLoss")!;
    expect(ni).toBeDefined();
    expect(ni.periods[0].value).toBe(838497645000);

    const leases = fin.balance.find((s) => s.concept === "OperatingLeaseLiabilityCurrent")!;
    expect(leases).toBeDefined();
    expect(leases.periods[0].value).toBe(15000000000);
  });
});

describe("classify", () => {
  it("classifies durations and instants", () => {
    expect(classify({ period_start: "2017-10-01", period_end: "2018-09-29" }, "0928")).toBe("FY");
    expect(classify({ period_start: "2018-12-30", period_end: "2019-03-30" }, "0928")).toBe("Q");
    expect(classify({ period_start: "2018-09-30", period_end: "2019-03-30" }, "0928")).toBe("YTD");
    expect(classify({ period_start: "", period_end: "2018-09-29" }, "0928")).toBe("FY");
    expect(classify({ period_start: "", period_end: "2019-03-30" }, "0928")).toBe("Q");
  });

  it("handles fiscal year end near a year boundary", () => {
    expect(isFiscalYearEnd("2024-01-02", "1231")).toBe(true);
    expect(isFiscalYearEnd("2024-06-30", "1231")).toBe(false);
  });
});

describe("buildFinancials", () => {
  const rows = extractFacts(cf);

  it("merges revenue tags across ASC 606 change, annual only", () => {
    const fin = buildFinancials(rows, { fiscalYearEnd: "0928", period: "annual" });
    const rev = fin.income.find((s) => s.concept === "Revenues")!;
    expect(rev.periods.map((p) => p.end)).toEqual(["2017-09-30", "2018-09-29"]);
    expect(rev.periods.every((p) => p.type === "FY")).toBe(true);
    // FY2018 balance sheet
    expect(fin.balance.find((s) => s.concept === "Assets")!.periods).toHaveLength(1);
    // Lease and SaaS concepts (quarterly / all)
    const finAll = buildFinancials(rows, { fiscalYearEnd: "0928", period: "all" });
    expect(finAll.balance.find((s) => s.concept === "OperatingLeaseLiabilityCurrent")).toBeDefined();
    expect(finAll.balance.find((s) => s.concept === "RemainingPerformanceObligation")).toBeDefined();
  });

  it("quarterly view includes quarter flows and all balance-sheet dates", () => {
    const fin = buildFinancials(rows, { fiscalYearEnd: "0928", period: "quarterly" });
    const rev = fin.income.find((s) => s.concept === "Revenues")!;
    expect(rev.periods.map((p) => p.value)).toEqual([58015]);
    expect(fin.balance.find((s) => s.concept === "Assets")!.periods).toHaveLength(2);
  });

  it("respects fromYear", () => {
    const fin = buildFinancials(rows, { fiscalYearEnd: "0928", period: "annual", fromYear: 2018 });
    expect(fin.income.find((s) => s.concept === "Revenues")!.periods).toHaveLength(1);
  });
});

describe("freshness", () => {
  const now = Date.parse("2026-10-23T00:00:00Z");
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
  it("implements the 60-day policy with daily rechecks", () => {
    expect(freshness({ refreshed_at: null, checked_at: null }, now)).toBe("missing");
    expect(freshness({ refreshed_at: daysAgo(10), checked_at: daysAgo(10) }, now)).toBe("fresh");
    expect(freshness({ refreshed_at: daysAgo(61), checked_at: daysAgo(61) }, now)).toBe("due");
    expect(freshness({ refreshed_at: daysAgo(70), checked_at: daysAgo(0.5) }, now)).toBe("recently-checked");
  });
});
