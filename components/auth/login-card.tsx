"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Cloud, LoaderCircle, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

export function LoginCard({ nextPath, oauthError = false }: { nextPath: string; oauthError?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "signed-out" | "guest" | "google">("loading");
  const [busy, setBusy] = useState<"guest" | "google" | null>(null);
  const [message, setMessage] = useState<string | null>(oauthError ? "Google Login ยังไม่สำเร็จ กรุณาลองอีกครั้ง" : null);

  useEffect(() => { let active = true; void createClient().auth.getUser().then(({ data }) => { if (active) setMode(!data.user ? "signed-out" : data.user.is_anonymous ? "guest" : "google"); }); return () => { active = false; }; }, []);
  const continueToApp = () => { router.replace(nextPath); router.refresh(); };

  const signInGuest = async () => {
    if (mode === "guest" || mode === "google") return continueToApp();
    setBusy("guest"); setMessage(null);
    const { error } = await createClient().auth.signInAnonymously();
    if (error) { setMessage(error.message.includes("disabled") ? "Anonymous Sign-In ยังไม่เปิดใน Supabase" : `เข้าแบบ Guest ไม่สำเร็จ: ${error.message}`); setBusy(null); return; }
    continueToApp();
  };

  const signInGoogle = async () => {
    if (mode === "google") return continueToApp();
    setBusy("google"); setMessage(null);
    const callback = new URL("/auth/callback", window.location.origin); callback.searchParams.set("next", nextPath);
    const supabase = createClient();
    const options = { redirectTo: callback.toString() };
    const { error } = mode === "guest" ? await supabase.auth.linkIdentity({ provider: "google", options }) : await supabase.auth.signInWithOAuth({ provider: "google", options });
    if (error) { setMessage(`เชื่อม Google ไม่สำเร็จ: ${error.message}`); setBusy(null); }
  };

  return (
    <Card className="relative z-10 w-full max-w-md overflow-hidden border-primary/15 shadow-[0_32px_100px_rgba(0,0,0,.48)]">
      <div className="h-1 bg-[linear-gradient(90deg,transparent,#d8b568,transparent)]" />
      <CardHeader className="items-center px-6 pb-4 pt-8 text-center"><span className="mb-3 flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8"><Sparkles className="size-7 text-primary" /></span><p className="text-[10px] font-semibold uppercase tracking-[.28em] text-primary">Dream · Number · Community</p><h1 className="font-display text-4xl font-bold">ตีหวย</h1><p className="max-w-xs text-sm leading-6 text-muted-foreground">ตีเลขจากความฝัน เก็บเลขตามงวด และติดตามผลทางการในที่เดียว</p></CardHeader>
      <CardContent className="space-y-5 px-6 pb-7">
        {mode === "guest" ? <Alert><ShieldCheck className="size-4" /><AlertDescription>คุณใช้บัญชี Guest อยู่ ข้อมูลถูกเก็บใน Supabase ครบเหมือน Google และเชื่อมบัญชีภายหลังได้</AlertDescription></Alert> : null}
        {mode === "google" ? <Alert><Cloud className="size-4" /><AlertDescription>บัญชี Google พร้อมแล้ว ข้อมูลของคุณซิงก์ข้ามอุปกรณ์ได้</AlertDescription></Alert> : null}
        <div className="space-y-3">
          <Button type="button" size="lg" className="w-full bg-white text-black shadow-none hover:bg-white/90" disabled={mode === "loading" || busy !== null} onClick={() => void signInGoogle()}>
            {busy === "google" ? <LoaderCircle className="animate-spin" /> : <span className="text-base font-black">G</span>} {mode === "guest" ? "เชื่อมบัญชี Google" : mode === "google" ? "เข้าแอปด้วย Google" : "เข้าสู่ระบบด้วย Google"}
          </Button>
          <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-[10px] text-muted-foreground">หรือเริ่มทันที</span><Separator className="flex-1" /></div>
          <Button type="button" variant="gold" size="lg" className="w-full" disabled={mode === "loading" || busy !== null} onClick={() => void signInGuest()}>
            {busy === "guest" ? <LoaderCircle className="animate-spin" /> : mode === "signed-out" ? <UserRound /> : <ArrowRight />} {mode === "signed-out" ? "ใช้งานแบบ Guest" : "เข้าแอปต่อ"}
          </Button>
        </div>
        {message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground"><span>มี User ID</span><span>ข้อมูลไม่ต่างกัน</span><span>เชื่อม Google ได้</span></div>
        <p className="text-center text-[10px] leading-4 text-muted-foreground">เมื่อใช้งานต่อ ถือว่ายอมรับเงื่อนไขการใช้บริการ ผลเลขทั้งหมดมีไว้เพื่อความบันเทิง</p>
      </CardContent>
    </Card>
  );
}
