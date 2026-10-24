import { getMidnightUtcTimestamp, getUtcToday } from "@/lib/auth";
import { getTodayUsage, getUserByApiKey } from "@/lib/db";
import { json, preflight } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const apiKey = (req.headers.get("x-api-key") || url.searchParams.get("api_key") || "").trim();

  if (!apiKey) {
    return json({ error: "unauthorized", message: "API key is required." }, 401);
  }

  const user = await getUserByApiKey(apiKey);
  if (!user) {
    return json({ error: "unauthorized", message: "Invalid API key." }, 401);
  }

  const today = getUtcToday();
  const todayUsage = await getTodayUsage(user.api_key, today);
  const resetTimestamp = getMidnightUtcTimestamp();

  return json({
    ok: true,
    user: {
      name: user.name,
      email: user.email,
      apiKey: user.api_key,
      tier: user.tier,
      dailyLimit: user.daily_limit,
      requestsUsedToday: todayUsage,
      remainingToday: Math.max(0, user.daily_limit - todayUsage),
      totalLifetimeRequests: user.total_requests,
      lastTicker: user.last_ticker,
      lastUsedAt: user.last_used_at,
      resetsAt: new Date(resetTimestamp * 1000).toISOString(),
    },
  });
}
