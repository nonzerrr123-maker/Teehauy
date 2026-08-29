import { NextResponse } from "next/server";

import { authenticateAccount, createSession, sessionCookie } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { readGuestHash } from "@/lib/guest-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginBody = { email?: unknown; password?: unknown };

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "DATABASE_NOT_CONFIGURED", message: "ระบบบัญชียังไม่พร้อมใช้งาน" }, { status: 503 });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON", message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "CREDENTIALS_REQUIRED", message: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 422 });
  }

  try {
    const user = await authenticateAccount(email, password, readGuestHash(request));
    if (!user) {
      return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const token = await createSession(user.id);
    return NextResponse.json(
      { ok: true, user },
      { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Account login failed", error);
    return NextResponse.json({ ok: false, error: "LOGIN_FAILED", message: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
}
