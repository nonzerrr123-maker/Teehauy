import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: true, authenticated: false, user: null, available: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const user = await getSessionUser(request);
    return NextResponse.json(
      { ok: true, authenticated: Boolean(user), user, available: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: true, authenticated: false, user: null, available: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
