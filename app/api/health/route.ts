import { NextResponse } from "next/server";

import { getDatabaseHealth } from "@/lib/database-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await getDatabaseHealth();
  const healthy = !database.configured || (database.reachable && database.schemaReady);

  return NextResponse.json(
    {
      ok: healthy,
      service: "teehauy",
      version: 2,
      persistenceMode: database.schemaReady ? "database" : "local-fallback",
      database,
      checkedAt: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
