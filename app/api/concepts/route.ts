import { CONCEPTS } from "@/lib/concepts";
import { json, preflight } from "@/lib/http";

export const dynamic = "force-static";

export function OPTIONS() {
  return preflight();
}

export function GET() {
  return json(
    {
      count: CONCEPTS.length,
      concepts: CONCEPTS.map((c) => ({ name: c.name, group: c.group, sourceTags: c.tags })),
    },
    200,
    { "Cache-Control": "public, s-maxage=86400" },
  );
}
