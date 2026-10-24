import { ready } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await ready();
    const r = await c.execute("SELECT COUNT(*) AS companies FROM companies WHERE refreshed_at IS NOT NULL");
    return json({ ok: true, db: "up", companiesCached: Number(r.rows[0]?.companies ?? 0), secUserAgentSet: !!process.env.SEC_USER_AGENT });
  } catch (e) {
    return json({ ok: false, db: "down", error: e instanceof Error ? e.message : String(e) }, 503);
  }
}
