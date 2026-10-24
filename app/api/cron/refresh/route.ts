import { ready, type CompanyRow } from "@/lib/db";
import { freshness } from "@/lib/freshness";
import { checkCronSecret, json } from "@/lib/http";
import { refreshCompany, type RefreshResult } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TIME_BUDGET_MS = 240_000;

/**
 * Called nightly by GitHub Actions (.github/workflows/nightly-refresh.yml).
 * Refreshes the top-N most requested companies that are due under the 60-day policy.
 */
async function handle(req: Request) {
  if (!checkCronSecret(req)) return json({ error: "unauthorized" }, 401);
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 50) || 50, 200);

  const c = await ready();
  const r = await c.execute({
    sql: "SELECT * FROM companies ORDER BY request_count DESC LIMIT ?",
    args: [limit],
  });
  const companies = r.rows as unknown as CompanyRow[];
  const started = Date.now();
  const results: Array<{ cik: string; ticker: string | null; result: RefreshResult | { status: "skipped"; reason: string } }> = [];

  for (const co of companies) {
    const state = freshness(co);
    if (state === "fresh" || state === "recently-checked") {
      results.push({ cik: co.cik, ticker: co.ticker, result: { status: "skipped", reason: state } });
      continue;
    }
    if (Date.now() - started > TIME_BUDGET_MS) {
      results.push({ cik: co.cik, ticker: co.ticker, result: { status: "skipped", reason: "time budget" } });
      continue;
    }
    results.push({ cik: co.cik, ticker: co.ticker, result: await refreshCompany(co.cik) });
  }

  const summary = results.reduce<Record<string, number>>((acc, x) => {
    acc[x.result.status] = (acc[x.result.status] ?? 0) + 1;
    return acc;
  }, {});
  return json({ ok: true, considered: companies.length, summary, results });
}

export const GET = handle;
export const POST = handle;
