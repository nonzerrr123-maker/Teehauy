"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginCard({ nextPath, oauthError = false }: { nextPath: string; oauthError?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "signed-out" | "guest" | "google">("loading");
  const [busy, setBusy] = useState<"guest" | "google" | null>(null);
  const [message, setMessage] = useState<string | null>(oauthError ? "Google Login ยังไม่สำเร็จ กรุณาลองอีกครั้ง" : null);

  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(({ data }) => {
      if (!active) return;
      setMode(!data.user ? "signed-out" : data.user.is_anonymous ? "guest" : "google");
    });
    return () => { active = false; };
  }, []);

  const continueToApp = () => { router.replace(nextPath); router.refresh(); };
  const signInGuest = async () => {
    if (mode === "guest" || mode === "google") return continueToApp();
    setBusy("guest"); setMessage(null);
    const { error } = await createClient().auth.signInAnonymously();
    if (error) { setMessage(error.message.includes("disabled") ? "ต้องเปิด Anonymous Sign-Ins ใน Supabase Auth ก่อน" : "เข้าแบบ Guest ไม่สำเร็จ: " + error.message); setBusy(null); return; }
    continueToApp();
  };
  const signInGoogle = async () => {
    if (mode === "google") return continueToApp();
    setBusy("google"); setMessage(null);
    const callback = new URL("/auth/callback", window.location.origin); callback.searchParams.set("next", nextPath);
    const supabase = createClient();
    const options = { redirectTo: callback.toString() };
    const { error } = mode === "guest" ? await supabase.auth.linkIdentity({ provider: "google", options }) : await supabase.auth.signInWithOAuth({ provider: "google", options });
    if (error) { setMessage("เชื่อม Google ไม่สำเร็จ: " + error.message); setBusy(null); }
  };

  return <div className="relative z-10 w-full max-w-sm rounded-[30px] border border-[#c9a84c33] bg-[#0d0d18e8] p-6 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-xl">
    <div className="mb-6 text-center"><div className="gold-card mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl">🔮</div><p className="font-[Cinzel] text-[10px] uppercase tracking-[.34em] text-[#6b7585]">Dream · Number · Community</p><h1 className="shimmer mt-2 font-[Cinzel] text-3xl font-bold">TEEHUAY</h1><p className="mt-3 text-sm leading-6 text-[#8f98aa]">ตีเลขจากความฝัน บันทึกสถิติ และติดตามผลแบบมีข้อมูลอ้างอิง</p></div>
    {mode === "guest" ? <div className="mb-4 rounded-2xl border border-[#80d0c033] bg-[#80d0c00c] p-3 text-xs leading-5 text-[#91cfc2]">บัญชี Guest เก็บข้อมูลใน Supabase แล้ว เชื่อม Google ภายหลังได้โดยข้อมูลเดิมไม่หาย</div> : null}
    {mode === "google" ? <div className="mb-4 rounded-2xl border border-[#80d0c033] bg-[#80d0c00c] p-3 text-xs leading-5 text-[#91cfc2]">บัญชี Google พร้อมใช้งาน ประวัติซิงก์ข้ามอุปกรณ์ได้</div> : null}
    <div className="space-y-3"><button type="button" disabled={mode === "loading" || busy !== null} onClick={() => void signInGoogle()} className="w-full rounded-2xl bg-[#f7f8fa] py-3.5 text-sm font-bold text-[#171722] disabled:opacity-50">G · {busy === "google" ? "กำลังเชื่อมต่อ..." : mode === "guest" ? "เชื่อมบัญชี Google" : "เข้าสู่ระบบด้วย Google"}</button><div className="text-center text-[10px] text-[#4f5666]">หรือ</div><button type="button" disabled={mode === "loading" || busy !== null} onClick={() => void signInGuest()} className="gold-button w-full rounded-2xl py-3.5 text-sm font-bold">{busy === "guest" ? "กำลังสร้างบัญชี..." : mode === "signed-out" ? "เข้าใช้งานแบบ Guest" : "เข้าแอปต่อ"}</button></div>
    {message ? <p role="alert" className="mt-4 rounded-xl border border-[#ff806033] px-3 py-2 text-xs text-[#ff9d88]">{message}</p> : null}
    <p className="mt-5 text-center text-[10px] leading-4 text-[#555d6e]">Guest มี User ID และโปรไฟล์เหมือนบัญชีปกติ ควรเชื่อม Google ก่อนล้างข้อมูลเว็บไซต์</p>
  </div>;
}
