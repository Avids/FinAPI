/**
 * Creates the Turso schema. Usage:
 *   npm run migrate        (reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from env or .env.local)
 */
import { createClient } from "@libsql/client";
import { existsSync, readFileSync } from "node:fs";
import { SCHEMA_STATEMENTS } from "../lib/schema.ts";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error("TURSO_DATABASE_URL is not set");
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
await client.batch(SCHEMA_STATEMENTS, "write");
console.log(`Schema applied to ${url}`);
