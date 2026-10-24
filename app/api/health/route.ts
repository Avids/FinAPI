import { ready } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await ready();
    const [coRes, factsRes, listRes] = await Promise.all([
      c.execute("SELECT COUNT(*) AS companies FROM companies WHERE refreshed_at IS NOT NULL"),
      c.execute("SELECT COUNT(*) AS totalFacts FROM facts"),
      c.execute(`
        SELECT c.ticker, c.name, c.refreshed_at, COUNT(f.cik) AS factsCount
        FROM companies c
        LEFT JOIN facts f ON c.cik = f.cik
        WHERE c.refreshed_at IS NOT NULL
        GROUP BY c.cik
        ORDER BY c.request_count DESC, c.ticker ASC
      `),
    ]);

    return json({
      ok: true,
      db: "up",
      database: "Turso (libSQL / SQLite)",
      companiesCached: Number(coRes.rows[0]?.companies ?? 0),
      totalFactsStored: Number(factsRes.rows[0]?.totalFacts ?? 0),
      cachedCompanies: listRes.rows.map((r) => ({
        ticker: r.ticker,
        name: r.name,
        storedFactsRows: Number(r.factsCount ?? 0),
        refreshedAt: r.refreshed_at,
      })),
      secUserAgentSet: !!process.env.SEC_USER_AGENT,
    });
  } catch (e) {
    return json({ ok: false, db: "down", error: e instanceof Error ? e.message : String(e) }, 503);
  }
}
