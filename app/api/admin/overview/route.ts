import { getUtcToday } from "@/lib/auth";
import { getAllUsersWithUsage } from "@/lib/db";
import { checkAdminSecret, json, preflight } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  if (!checkAdminSecret(req)) {
    return json({ error: "unauthorized", message: "Invalid admin secret." }, 401);
  }

  const today = getUtcToday();
  const users = await getAllUsersWithUsage(today);

  const totalUsers = users.length;
  let activeUsersToday = 0;
  let totalRequestsToday = 0;
  let totalLifetimeRequests = 0;

  for (const u of users) {
    if (u.requests_today > 0) activeUsersToday++;
    totalRequestsToday += Number(u.requests_today || 0);
    totalLifetimeRequests += Number(u.total_requests || 0);
  }

  return json({
    ok: true,
    today,
    summary: {
      totalUsers,
      activeUsersToday,
      totalRequestsToday,
      totalLifetimeRequests,
    },
    users,
  });
}
