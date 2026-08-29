"use client";

import { useEffect, useState, type FormEvent } from "react";

import { ProfilePage } from "@/components/dream/profile-page";
import { getOrCreateGuestToken } from "@/lib/browser-guest";

type AuthUser = { id: string; email: string; displayName: string };
type SessionResponse = { ok: true; authenticated: boolean; user: AuthUser | null; available: boolean };
type AuthResponse = { ok: true; user: AuthUser } | { ok: false; message: string };

export function AccountProfilePage({ historyCount, favoriteCount }: { historyCount: number; favoriteCount: number }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSession = async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as SessionResponse;
      setSession(payload);
    } catch {
      setSession({ ok: true, authenticated: false, user: null, available: false });
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSession();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const guestToken = getOrCreateGuestToken();
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-teehauy-guest": guestToken,
        },
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, displayName }),
      });
      const payload = (await response.json()) as AuthResponse;
      if (!response.ok || !payload.ok) {
        setMessage(payload.ok ? "ทำรายการไม่สำเร็จ" : payload.message);
        return;
      }

      setSession({ ok: true, authenticated: true, user: payload.user, available: true });
      setPassword("");
      setMessage(mode === "login" ? "เข้าสู่ระบบแล้ว ประวัติจะผูกกับบัญชีนี้" : "สร้างบัญชีแล้ว และย้ายประวัติจากอุปกรณ์นี้เข้าบัญชีเรียบร้อย");
    } catch {
      setMessage("เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession({ ok: true, authenticated: false, user: null, available: true });
      setMessage("ออกจากระบบแล้ว อุปกรณ์นี้ยังใช้งานแบบ Guest ต่อได้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative h-full">
      <ProfilePage historyCount={historyCount} favoriteCount={favoriteCount} />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-5 top-8 z-30 rounded-xl border border-[#c9a84c55] bg-[#13131fee] px-3 py-2 text-[11px] font-semibold text-[#e1c96f] shadow-[0_0_20px_rgba(201,168,76,.12)] backdrop-blur"
      >
        {session?.authenticated ? "✓ บัญชี" : "บัญชี"}
      </button>

      {open ? (
        <div className="absolute inset-0 z-50 flex items-end bg-[#06060ccc] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full rounded-t-[28px] border-t border-[#c9a84c33] bg-[#0d0d18] px-5 pb-7 pt-4 shadow-[0_-20px_60px_rgba(0,0,0,.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#34384a]" />

            {session?.authenticated && session.user ? (
              <div>
                <p className="text-[11px] uppercase tracking-[.2em] text-[#6b7585]">Teehauy Account</p>
                <h2 className="mt-1 text-xl font-bold text-[#f0c040]">{session.user.displayName}</h2>
                <p className="mt-1 text-sm text-[#8b94a5]">{session.user.email}</p>
                <div className="mt-4 rounded-2xl border border-[#80d0c033] bg-[#80d0c00d] p-3 text-xs leading-5 text-[#91cfc2]">
                  เข้าสู่ระบบแล้ว ประวัติและรายการโปรดใหม่จะผูกกับบัญชีนี้ แม้เปลี่ยนอุปกรณ์ก็สามารถเรียกคืนจากฐานข้อมูลได้
                </div>
                {message ? <p className="mt-3 text-xs text-[#a8b8cc]">{message}</p> : null}
                <button type="button" disabled={submitting} onClick={() => void logout()} className="mt-5 w-full rounded-2xl border border-[#ff806044] bg-[#ff80600d] py-3 text-sm font-semibold text-[#ff987f] disabled:opacity-50">
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex rounded-xl border border-[#a8b8cc1c] bg-[#13131f] p-1">
                  {(["login", "register"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => { setMode(item); setMessage(null); }}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === item ? "bg-[#c9a84c1f] text-[#f0c040]" : "text-[#687183]"}`}
                    >
                      {item === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
                    </button>
                  ))}
                </div>

                <form onSubmit={submit} className="space-y-3">
                  {mode === "register" ? (
                    <label className="block text-xs text-[#8f98aa]">
                      ชื่อแสดงผล
                      <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} placeholder="นักตีเลข" className="mt-1.5 w-full rounded-xl border border-[#a8b8cc22] bg-[#13131f] px-3 py-3 text-sm text-[#d4e0ee] outline-none focus:border-[#c9a84c66]" />
                    </label>
                  ) : null}
                  <label className="block text-xs text-[#8f98aa]">
                    อีเมล
                    <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 w-full rounded-xl border border-[#a8b8cc22] bg-[#13131f] px-3 py-3 text-sm text-[#d4e0ee] outline-none focus:border-[#c9a84c66]" />
                  </label>
                  <label className="block text-xs text-[#8f98aa]">
                    รหัสผ่าน
                    <input required minLength={8} maxLength={128} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1.5 w-full rounded-xl border border-[#a8b8cc22] bg-[#13131f] px-3 py-3 text-sm text-[#d4e0ee] outline-none focus:border-[#c9a84c66]" />
                  </label>

                  {!session?.available ? (
                    <p className="rounded-xl border border-[#ff806033] bg-[#ff80600a] px-3 py-2 text-[11px] leading-4 text-[#d98b78]">ระบบบัญชียังไม่พร้อม ต้องเชื่อมฐานข้อมูลและรัน migration 002_auth.sql ก่อน</p>
                  ) : null}
                  {message ? <p className="text-xs leading-5 text-[#d6b867]">{message}</p> : null}

                  <button type="submit" disabled={submitting || session?.available === false} className="gold-button w-full rounded-2xl py-3.5 text-sm font-bold disabled:opacity-40">
                    {submitting ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
                  </button>
                </form>

                <p className="mt-4 text-center text-[10px] leading-4 text-[#4f5666]">หากยังไม่สมัครสมาชิก คุณยังใช้ Teehauy แบบ Guest ได้ตามปกติ</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
