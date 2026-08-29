import { NextResponse } from "next/server";

import { clearSessionCookie, deleteCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await deleteCurrentSession(request);
  } catch (error) {
    console.error("Failed to delete auth session", error);
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } },
  );
}
