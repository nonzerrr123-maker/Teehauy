import { NextResponse } from "next/server";

import { interpretDream } from "@/lib/dream-engine";

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
      version: 1,
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

  const result = interpretDream(dreamText);

  return NextResponse.json(
    { ok: true, result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
