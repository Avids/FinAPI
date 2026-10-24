/** Shared HTTP helpers: JSON responses, CORS, admin auth. */

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-admin-secret, authorization",
  };
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(), ...extra },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function checkCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export function checkAdminSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const custom = req.headers.get("x-admin-secret");
  const query = new URL(req.url).searchParams.get("admin_secret");
  return auth === secret || custom === secret || query === secret;
}
