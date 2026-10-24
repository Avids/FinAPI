import { randomBytes, randomUUID } from "node:crypto";
import { after } from "next/server";
import { createUser, getUserByEmail, getTodayUsage } from "@/lib/db";
import { getUtcToday } from "@/lib/auth";
import { sendApiKeyEmail } from "@/lib/email";
import { json, preflight } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!name || name.length < 2) {
      return json({ error: "bad_request", message: "Please provide a valid name (at least 2 characters)." }, 400);
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) {
      return json({ error: "bad_request", message: "Please provide a valid email address." }, 400);
    }

    // Check if user already exists -> recover key!
    const existing = await getUserByEmail(email);
    const today = getUtcToday();

    if (existing) {
      const todayUsage = await getTodayUsage(existing.api_key, today);

      // Send email in background
      after(async () => {
        try {
          await sendApiKeyEmail({
            name: existing.name,
            email: existing.email,
            apiKey: existing.api_key,
            dailyLimit: existing.daily_limit,
            isExistingUser: true,
          });
        } catch (e) {
          console.error("[Register] Error sending email to existing user:", e);
        }
      });

      return json(
        {
          ok: true,
          status: "existing_user",
          message: "Welcome back! Here is your existing API key (also sent to your email).",
          user: {
            name: existing.name,
            email: existing.email,
            apiKey: existing.api_key,
            tier: existing.tier,
            dailyLimit: existing.daily_limit,
            requestsUsedToday: todayUsage,
            remainingToday: Math.max(0, existing.daily_limit - todayUsage),
          },
        },
        200,
      );
    }

    // Generate new key
    const id = randomUUID();
    const apiKey = `fin_live_${randomBytes(16).toString("hex")}`;
    const user = await createUser({ id, name, email, apiKey, dailyLimit: 20 });

    // Send welcome email in background
    after(async () => {
      try {
        await sendApiKeyEmail({
          name: user.name,
          email: user.email,
          apiKey: user.api_key,
          dailyLimit: user.daily_limit,
          isExistingUser: false,
        });
      } catch (e) {
        console.error("[Register] Error sending welcome email:", e);
      }
    });

    return json(
      {
        ok: true,
        status: "created",
        message: "Your free API key has been generated and emailed to your inbox! You have 20 requests per day.",
        user: {
          name: user.name,
          email: user.email,
          apiKey: user.api_key,
          tier: user.tier,
          dailyLimit: user.daily_limit,
          requestsUsedToday: 0,
          remainingToday: user.daily_limit,
        },
      },
      201,
    );
  } catch (e) {
    return json({ error: "server_error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
}
