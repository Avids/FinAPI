/** Shared HTTP helpers: JSON responses, CORS, optional API-key auth. */

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
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

/** Returns an error Response if API_KEY is configured and the request doesn't carry it. */
export function checkApiKey(req: Request): Response | null {
  const key = process.env.API_KEY;
  if (!key) return null;
  if (req.headers.get("x-api-key") === key) return null;
  return json({ error: "unauthorized", message: "Missing or invalid x-api-key header" }, 401);
}

export function checkCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}
