"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Download, ExternalLink, LogOut, MonitorCog, Moon, Palette, ShieldCheck, Sun } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { getNotificationStatus, requestNotificationPermission } from "@/lib/browser-notifications";
import { applyThemePreference, type ThemePreference } from "@/lib/theme";

type Preferences = { notify_draw_reminder: boolean; notify_results: boolean; notify_matches: boolean; responsible_play_reminder: boolean; theme: ThemePreference };
type Profile = { account_kind: "guest" | "google"; display_name: string; username: string | null };

const defaults: Preferences = { notify_draw_reminder: true, notify_results: true, notify_matches: true, responsible_play_reminder: true, theme: "system" };

export function SettingsPage({ userId }: { userId: string }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(defaults);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void Promise.all([supabase.from("user_preferences").select("notify_draw_reminder,notify_results,notify_matches,responsible_play_reminder,theme").eq("user_id", userId).single(), supabase.from("profiles").select("account_kind,display_name,username").eq("id", userId).single()]).then(([prefs, account]) => {
      if (prefs.error || account.error) setMessage("โหลดการตั้งค่าบัญชีไม่สำเร็จ");
      if (prefs.data) {
        const next = prefs.data as Preferences;
        setPreferences(next);
        applyThemePreference(next.theme);
      }
      if (account.data) setProfile(account.data as Profile);
    });
  }, [userId]);

  const update = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next); setMessage(null);
    if (key === "theme") applyThemePreference(value as ThemePreference);
    const { error } = await createClient().from("user_preferences").update({ [key]: value }).eq("user_id", userId);
    if (error) {
      setPreferences(previous);
      if (key === "theme") applyThemePreference(previous.theme);
      setMessage("บันทึกการตั้งค่าไม่สำเร็จ");
    }
  };

  const enableNotifications = async () => {
    const current = getNotificationStatus();
    const permission = current === "granted" ? current : await requestNotificationPermission();
    setMessage(permission === "granted" ? "อนุญาตการแจ้งเตือนบนอุปกรณ์นี้แล้ว" : "ยังไม่ได้รับสิทธิ์แจ้งเตือน กรุณาเปิดจากการตั้งค่าเบราว์เซอร์");
  };

  const connectGoogle = async () => {
    setBusy(true); setMessage(null);
    const { error } = await createClient().auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings` } });
    if (error) { setBusy(false); setMessage(`เชื่อม Google ไม่สำเร็จ: ${error.message}`); }
  };

  const exportData = async () => {
    setBusy(true);
    const supabase = createClient();
    try {
      const results = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId), supabase.from("dreams").select("*").eq("user_id", userId), supabase.from("user_predictions").select("*,prediction_numbers(*)").eq("user_id", userId), supabase.from("posts").select("*").eq("author_id", userId), supabase.from("user_tickets").select("*").eq("user_id", userId),
      ]);
      if (results.some((result) => result.error)) throw new Error("EXPORT_QUERY_FAILED");
      const [profileData, dreamData, predictionData, postData, ticketData] = results;
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile: profileData.data, dreams: dreamData.data, predictions: predictionData.data, posts: postData.data, tickets: ticketData.data }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `teehauy-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage("เตรียมไฟล์ข้อมูลของคุณแล้ว");
    } catch {
      setMessage("ดาวน์โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); };

  return (
    <div className="space-y-5">
      <Card><CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-primary" /> บัญชี</CardTitle></CardHeader><CardContent className="space-y-3 p-4 pt-2"><div className="flex items-center justify-between rounded-xl bg-secondary p-3"><div><strong className="block text-sm">{profile?.account_kind === "google" ? "เชื่อม Google แล้ว" : profile?.display_name ?? "บัญชี Guest"}</strong><span className="text-[11px] text-muted-foreground">{profile?.account_kind === "guest" ? profile.username ? `@${profile.username} · ใช้งานอยู่บนอุปกรณ์นี้` : "ใช้งานอยู่บนอุปกรณ์นี้" : "ซิงก์ข้อมูลข้ามอุปกรณ์"}</span></div><span className={`size-2 rounded-full ${profile?.account_kind === "google" ? "bg-success" : "bg-warning"}`} /></div>{profile?.account_kind === "guest" ? <><Alert variant="warning"><AlertDescription>อย่าออกจากระบบหรือล้างข้อมูลเว็บไซต์ก่อนเชื่อม Google เพราะบัญชี Guest เดิมอาจกู้คืนไม่ได้</AlertDescription></Alert><Button type="button" variant="outline" className="w-full bg-white text-black hover:bg-white/90 hover:text-black" disabled={busy} onClick={() => void connectGoogle()}><ExternalLink /> เชื่อม Google โดยคงข้อมูลเดิม</Button></> : null}</CardContent></Card>

      <Card><CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><BellRing className="size-4 text-primary" /> การแจ้งเตือน</CardTitle></CardHeader><CardContent className="space-y-1 p-2 pt-0"><SettingRow title="เตือนก่อนวันออกรางวัล" detail="แจ้งเตือนงวดที่มีเลขบันทึกไว้" checked={preferences.notify_draw_reminder} onChange={(value) => void update("notify_draw_reminder", value)} /><Separator /><SettingRow title="ผลรางวัลออกแล้ว" detail="เมื่อข้อมูลทางการถูกนำเข้าและยืนยัน" checked={preferences.notify_results} onChange={(value) => void update("notify_results", value)} /><Separator /><SettingRow title="เลขของฉันตรงกับผล" detail="เฉพาะเลขที่ผูกกับงวดไว้ก่อนประกาศผล" checked={preferences.notify_matches} onChange={(value) => void update("notify_matches", value)} /><Button type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={() => void enableNotifications()}>ตรวจสิทธิ์แจ้งเตือนบนอุปกรณ์</Button></CardContent></Card>

      <Card><CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Palette className="size-4 text-primary" /> การแสดงผลและความปลอดภัย</CardTitle></CardHeader><CardContent className="space-y-3 p-4 pt-2"><div><p className="text-sm font-semibold">ธีมของแอป</p><p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">เลือกโหมดสว่าง มืด หรือตามการตั้งค่าของอุปกรณ์</p></div><div className="grid grid-cols-3 gap-2" role="group" aria-label="เลือกธีม"><ThemeButton active={preferences.theme === "light"} icon={Sun} label="สว่าง" onClick={() => void update("theme", "light")} /><ThemeButton active={preferences.theme === "dark"} icon={Moon} label="มืด" onClick={() => void update("theme", "dark")} /><ThemeButton active={preferences.theme === "system"} icon={MonitorCog} label="ตามระบบ" onClick={() => void update("theme", "system")} /></div><Separator /><SettingRow title="เตือนใช้งานอย่างรับผิดชอบ" detail="แสดงข้อความเตือนเมื่อใช้งานต่อเนื่อง" checked={preferences.responsible_play_reminder} onChange={(value) => void update("responsible_play_reminder", value)} /></CardContent></Card>

      <Alert><AlertTitle>ผลลัพธ์ไม่ใช่คำแนะนำทางการเงิน</AlertTitle><AlertDescription>เลขจากความฝัน ชุมชน และแบบจำลองมีไว้เพื่อความบันเทิง ไม่มีวิธีคำนวณใดรับประกันการถูกรางวัล</AlertDescription></Alert>

      <Card><CardContent className="space-y-2 p-3"><Button type="button" variant="ghost" className="w-full justify-start" disabled={busy} onClick={() => void exportData()}><Download /> ดาวน์โหลดข้อมูลของฉัน</Button>{profile?.account_kind === "google" ? <><Separator /><Button type="button" variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => void logout()}><LogOut /> ออกจากระบบ</Button></> : null}</CardContent></Card>
      {message ? <p role="status" className="text-center text-xs text-primary">{message}</p> : null}
      <p className="text-center text-[10px] text-muted-foreground">Teehuay · ตีเลข เก็บเลข และติดตามผลในที่เดียว</p>
    </div>
  );
}

function SettingRow({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) { return <div className="flex items-center gap-4 rounded-xl p-3"><div className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{detail}</span></div><Switch checked={checked} onCheckedChange={onChange} aria-label={title} /></div>; }

function ThemeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Sun; label: string; onClick: () => void }) {
  return <Button type="button" variant={active ? "secondary" : "outline"} aria-pressed={active} className={active ? "h-auto flex-col gap-1.5 border border-primary/30 bg-primary/10 py-3 text-primary" : "h-auto flex-col gap-1.5 py-3"} onClick={onClick}><Icon className="size-5" /><span className="text-xs">{label}</span></Button>;
}
