import { NextResponse } from "next/server";

import { isDatabaseConfigured, listDreamFavorites, listDreamHistory } from "@/lib/db";
import { readGuestHash } from "@/lib/guest-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ownerHash = readGuestHash(request);

  if (!ownerHash) {
    return NextResponse.json(
      { ok: false, error: "GUEST_TOKEN_REQUIRED", message: "ไม่พบตัวระบุอุปกรณ์" },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_NOT_CONFIGURED", message: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ" },
      { status: 503 },
    );
  }

  try {
    const [history, favorites] = await Promise.all([
      listDreamHistory(ownerHash, 30),
      listDreamFavorites(ownerHash, 100),
    ]);

    return NextResponse.json(
      { ok: true, history, favorites },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load dream history", error);
    return NextResponse.json(
      { ok: false, error: "DATABASE_UNAVAILABLE", message: "ยังโหลดประวัติจากฐานข้อมูลไม่ได้" },
      { status: 503 },
    );
  }
}
