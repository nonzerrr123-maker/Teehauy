import { NextResponse } from "next/server";

import { createAccount, createSession, sessionCookie } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { readGuestHash } from "@/lib/guest-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterBody = { email?: unknown; password?: unknown; displayName?: unknown };

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_NOT_CONFIGURED", message: "ระบบบัญชียังไม่พร้อมใช้งาน" }, { status: 503 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON", message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "INVALID_EMAIL", message: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 422 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ ok: false, error: "INVALID_PASSWORD", message: "รหัสผ่านต้องมี 8-128 ตัวอักษร" }, { status: 422 });
  }
  if (displayName.length > 60) {
    return NextResponse.json({ ok: false, error: "INVALID_DISPLAY_NAME", message: "ชื่อแสดงผลยาวเกินไป" }, { status: 422 });
  }

  try {
    const user = await createAccount({
      email,
      password,
      displayName,
      guestOwnerHash: readGuestHash(request),
    });
    const token = await createSession(user.id);
    return NextResponse.json(
      { ok: true, user },
      { status: 201, headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ ok: false, error: "EMAIL_EXISTS", message: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
    }
    console.error("Account registration failed", error);
    return NextResponse.json({ ok: false, error: "REGISTER_FAILED", message: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
}
