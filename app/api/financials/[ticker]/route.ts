import { after } from "next/server";
import { CONCEPTS, CONCEPTS_BY_NAME, type ConceptDef } from "@/lib/concepts";
import { getCompanyByCik, getFacts, incrementRequestCount, type CompanyRow } from "@/lib/db";
import { freshness, isStale } from "@/lib/freshness";
import { checkApiKey, json, preflight } from "@/lib/http";
import { refreshCompany } from "@/lib/ingest";
import { buildFinancials, type PeriodFilter } from "@/lib/normalize";
import { resolveCompany } from "@/lib/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const denied = checkApiKey(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const { ticker: rawTicker } = await ctx.params;

  // ── Parse query params ──
  const periodParam = (url.searchParams.get("period") ?? "all").toLowerCase();
  if (!["annual", "quarterly", "all"].includes(periodParam)) {
    return json({ error: "bad_request", message: "period must be annual | quarterly | all" }, 400);
  }
  const fromParam = url.searchParams.get("from");
  const fromYear = fromParam ? Number(fromParam) : undefined;
  if (fromParam && !Number.isInteger(fromYear)) return json({ error: "bad_request", message: "from must be a year" }, 400);

  let concepts: ConceptDef[] = CONCEPTS;
  const conceptsParam = url.searchParams.get("concepts");
  if (conceptsParam) {
    const names = conceptsParam.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = names.filter((n) => !CONCEPTS_BY_NAME.has(n.toLowerCase()));
    if (unknown.length) {
      return json({ error: "bad_request", message: `unknown concepts: ${unknown.join(", ")}`, see: "/api/concepts" }, 400);
    }
    concepts = names.map((n) => CONCEPTS_BY_NAME.get(n.toLowerCase())!);
  }
  const wait = ["1", "true"].includes(url.searchParams.get("wait") ?? "");

  // ── Resolve ticker ──
  const resolved = await resolveCompany(rawTicker);
  if (!resolved.ok) return json({ error: resolved.status === 404 ? "not_found" : "bad_request", message: resolved.error }, resolved.status);
  let company: CompanyRow = resolved.company;
  const cik = company.cik;

  after(() => incrementRequestCount(cik).catch(() => {}));

  // ── Freshness / stale-while-revalidate ──
  const state = freshness(company);
  if (state === "missing") {
    if (!wait) {
      after(() => refreshCompany(cik));
      return json(
        {
          status: "pending",
          ticker: resolved.ticker,
          cik,
          message: "First request for this ticker: loading from SEC EDGAR. Retry in a few seconds (or pass ?wait=true).",
          ...(company.last_error ? { lastError: company.last_error } : {}),
        },
        202,
        { "Retry-After": "5", "Cache-Control": "no-store" },
      );
    }
    const r = await refreshCompany(cik);
    if (r.status === "locked") company = await waitForData(cik, 90_000);
    else company = (await getCompanyByCik(cik)) ?? company;
    if (!company.refreshed_at) {
      return json(
        { status: "pending", ticker: resolved.ticker, cik, message: "Still loading, retry shortly.", ...(r.status === "error" ? { lastError: r.error } : {}) },
        r.status === "error" ? 502 : 202,
        { "Retry-After": "5", "Cache-Control": "no-store" },
      );
    }
  } else if (state === "due") {
    after(() => refreshCompany(cik));
  }

  // ── Build response ──
  const tags = [...new Set(concepts.flatMap((c) => c.tags))];
  const rows = await getFacts(cik, tags);
  const financials = buildFinancials(rows, {
    fiscalYearEnd: company.fiscal_year_end,
    period: periodParam as PeriodFilter,
    fromYear,
    concepts,
  });

  const cacheControl = process.env.API_KEY
    ? "private, max-age=300"
    : "public, s-maxage=3600, stale-while-revalidate=86400";

  return json(
    {
      ticker: resolved.ticker,
      cik,
      company: {
        name: company.name,
        sic: company.sic,
        sicDescription: company.sic_description,
        fiscalYearEnd: company.fiscal_year_end ? `${company.fiscal_year_end.slice(0, 2)}-${company.fiscal_year_end.slice(2)}` : null,
      },
      dataFreshness: {
        refreshedAt: company.refreshed_at,
        checkedAt: company.checked_at,
        latestFilingDate: company.latest_filing_date,
        latestAccession: company.latest_accession,
        isStale: isStale(company),
        revalidating: state === "due",
      },
      financials,
    },
    200,
    { "Cache-Control": cacheControl },
  );
}

async function waitForData(cik: string, timeoutMs: number): Promise<CompanyRow> {
  const deadline = Date.now() + timeoutMs;
  let c = (await getCompanyByCik(cik))!;
  while (!c.refreshed_at && c.refresh_lock && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    c = (await getCompanyByCik(cik))!;
  }
  return c;
}
