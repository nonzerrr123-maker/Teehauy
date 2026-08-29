import { NextResponse } from "next/server";

import { isDatabaseConfigured, setDreamFavorite } from "@/lib/db";
import { resolveRequestOwner } from "@/lib/request-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FavoriteRequest = {
  interpretationId?: unknown;
  favorite?: unknown;
};

export async function POST(request: Request) {
  const { ownerHash, authenticated } = await resolveRequestOwner(request);

  if (!ownerHash) {
    return NextResponse.json(
      { ok: false, error: "OWNER_REQUIRED", message: "ไม่พบตัวระบุบัญชีหรืออุปกรณ์" },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_NOT_CONFIGURED", message: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ" },
      { status: 503 },
    );
  }

  let payload: FavoriteRequest;
  try {
    payload = (await request.json()) as FavoriteRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON", message: "รูปแบบข้อมูลไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  if (
    typeof payload.interpretationId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(payload.interpretationId) ||
    typeof payload.favorite !== "boolean"
  ) {
    return NextResponse.json(
      { ok: false, error: "INVALID_FAVORITE", message: "ข้อมูลรายการโปรดไม่ถูกต้อง" },
      { status: 422 },
    );
  }

  try {
    const favorite = await setDreamFavorite(ownerHash, payload.interpretationId, payload.favorite);
    return NextResponse.json(
      { ok: true, favorite, authenticated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to update dream favorite", error);
    return NextResponse.json(
      { ok: false, error: "DATABASE_UNAVAILABLE", message: "ยังบันทึกรายการโปรดไม่ได้" },
      { status: 503 },
    );
  }
}
