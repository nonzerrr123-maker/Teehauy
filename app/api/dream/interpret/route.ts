import { NextResponse } from "next/server";

import { isDatabaseConfigured, saveDreamInterpretation } from "@/lib/db";
import { interpretDream } from "@/lib/dream-engine";
import { resolveRequestOwner } from "@/lib/request-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InterpretRequest = {
  dreamText?: unknown;
};

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "teehauy-dream-interpretation",
      version: 3,
      databaseConfigured: isDatabaseConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let payload: InterpretRequest;

  try {
    payload = (await request.json()) as InterpretRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON", message: "รูปแบบข้อมูลไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  if (typeof payload.dreamText !== "string") {
    return NextResponse.json(
      { ok: false, error: "INVALID_DREAM_TEXT", message: "กรุณาระบุความฝันเป็นข้อความ" },
      { status: 400 },
    );
  }

  const dreamText = payload.dreamText.trim();

  if (dreamText.length < 2 || dreamText.length > 300) {
    return NextResponse.json(
      {
        ok: false,
        error: "DREAM_TEXT_LENGTH",
        message: "ความฝันต้องมีความยาว 2-300 ตัวอักษร",
      },
      { status: 422 },
    );
  }

  let result = interpretDream(dreamText);
  let persisted = false;
  const { ownerHash, authenticated } = await resolveRequestOwner(request);

  if (ownerHash && isDatabaseConfigured()) {
    try {
      result = await saveDreamInterpretation(ownerHash, result);
      persisted = true;
    } catch (error) {
      console.error("Failed to persist dream interpretation", error);
    }
  }

  return NextResponse.json(
    { ok: true, result, persisted, authenticated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
