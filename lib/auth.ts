/**
 * API Key authentication and daily rate-limiting guard.
 */
import { getUserByApiKey, getTodayUsage, recordApiUsage, type UserRow } from "./db";
import { json } from "./http";

export interface AuthSuccess {
  ok: true;
  user: UserRow | null; // null if master key used
  isMaster: boolean;
  limit: number;
  remaining: number;
  headers: Record<string, string>;
}

export interface AuthFailure {
  ok: false;
  response: Response;
}

export type AuthResult = AuthSuccess | AuthFailure;

export function getUtcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getMidnightUtcTimestamp(): number {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.floor(tomorrow.getTime() / 1000);
}

export async function authenticateAndRateLimit(req: Request, ticker?: string): Promise<AuthResult> {
  const url = new URL(req.url);
  const headerKey = req.headers.get("x-api-key");
  const queryKey = url.searchParams.get("api_key");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey = (headerKey || queryKey || bearer || "").trim();

  // 1. Check Master / Admin Secret (unlimited access)
  const masterKey = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (masterKey && apiKey === masterKey) {
    return {
      ok: true,
      user: null,
      isMaster: true,
      limit: 999999,
      remaining: 999999,
      headers: {
        "X-RateLimit-Limit": "999999",
        "X-RateLimit-Remaining": "999999",
      },
    };
  }

  // 2. Reject missing API key
  if (!apiKey) {
    return {
      ok: false,
      response: json(
        {
          error: "unauthorized",
          message: "API key is required. Pass header 'x-api-key: YOUR_KEY' or '?api_key=YOUR_KEY'.",
          registerUrl: "https://finapi2026.vercel.app",
        },
        401,
      ),
    };
  }

  // 3. Look up user in Turso
  const user = await getUserByApiKey(apiKey);
  if (!user) {
    return {
      ok: false,
      response: json(
        {
          error: "unauthorized",
          message: "Invalid API key. Register for a free key at https://finapi2026.vercel.app",
        },
        401,
      ),
    };
  }

  // 4. Rate Limiting (Daily UTC window)
  const today = getUtcToday();
  const usage = await getTodayUsage(user.api_key, today);
  const resetTimestamp = getMidnightUtcTimestamp();

  if (usage >= user.daily_limit) {
    return {
      ok: false,
      response: json(
        {
          error: "rate_limit_exceeded",
          message: `Daily limit of ${user.daily_limit} requests reached. Quota resets at 00:00 UTC.`,
          dailyLimit: user.daily_limit,
          requestsUsedToday: usage,
          remaining: 0,
          resetsAt: new Date(resetTimestamp * 1000).toISOString(),
        },
        429,
        {
          "X-RateLimit-Limit": String(user.daily_limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetTimestamp),
          "Retry-After": String(Math.max(1, resetTimestamp - Math.floor(Date.now() / 1000))),
        },
      ),
    };
  }

  // Record usage in background / async
  await recordApiUsage(user.api_key, today, ticker);

  const remaining = Math.max(0, user.daily_limit - (usage + 1));
  return {
    ok: true,
    user,
    isMaster: false,
    limit: user.daily_limit,
    remaining,
    headers: {
      "X-RateLimit-Limit": String(user.daily_limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetTimestamp),
    },
  };
}
