import { updateUserDailyLimit } from "@/lib/db";
import { checkAdminSecret, json, preflight } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return json({ error: "unauthorized", message: "Invalid admin secret." }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const user = String(body.userIdOrEmail ?? "").trim();
  const limit = Number(body.dailyLimit);

  if (!user || !Number.isInteger(limit) || limit < 0) {
    return json({ error: "bad_request", message: "Please provide a valid userIdOrEmail and a positive dailyLimit." }, 400);
  }

  const updated = await updateUserDailyLimit(user, limit);
  if (!updated) {
    return json({ error: "not_found", message: "User not found." }, 404);
  }

  return json({ ok: true, message: `Updated daily limit to ${limit} for ${user}.` });
}
