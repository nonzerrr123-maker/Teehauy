"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Hash, LoaderCircle, LockKeyhole } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Draw = { id: string; draw_date: string };

export function PredictionsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawId, setDrawId] = useState("");
  const [numbers, setNumbers] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loadingDraws, setLoadingDraws] = useState(true);
  const [busy, setBusy] = useState(false);
  const values = [...new Set(numbers.split(/[\s,]+/).filter(Boolean))];

  useEffect(() => { let active = true; void createClient().from("lottery_draws").select("id,draw_date").eq("status", "scheduled").order("draw_date").then(({ data, error }) => { if (active) { setLoadingDraws(false); if (error) { setMessage("โหลดข้อมูลงวดไม่สำเร็จ"); return; } const next = (data ?? []) as Draw[]; setDraws(next); setDrawId(next[0]?.id ?? ""); } }); return () => { active = false; }; }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!drawId) return setMessage("ยังไม่มีงวดที่เปิดรับเลข");
    if (!values.length || values.length > 30 || values.some((value) => !/^\d{2}$|^\d{3}$|^\d{6}$/.test(value))) return setMessage("ใส่เลข 2, 3 หรือ 6 หลัก คั่นด้วยช่องว่างหรือจุลภาค สูงสุด 30 เลข");
    setBusy(true); setMessage(null);
    const payload = values.map((value) => ({ value, kind: value.length === 2 ? "dream_two" : value.length === 3 ? "dream_three" : "six_digit_ticket" }));
    const { error } = await createClient().rpc("submit_prediction", { p_draw_id: drawId, p_source_type: "manual", p_title: title, p_note: "", p_is_public: false, p_numbers: payload });
    setBusy(false);
    if (error) return setMessage(`บันทึกไม่สำเร็จ: ${error.message}`);
    setNumbers(""); setTitle(""); setMessage("บันทึกและล็อกเลขตามงวดแล้ว");
  };

  return (
    <div className="space-y-4">
      <Alert><LockKeyhole className="size-4" /><AlertDescription>เลขจะถูกล็อกพร้อมเวลาเมื่อยืนยัน เพื่อให้ตรวจย้อนหลังได้อย่างโปร่งใส และแก้ไขหลังส่งไม่ได้</AlertDescription></Alert>
      <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-base">ชุดเลขใหม่</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="prediction-draw">งวดที่ต้องการตรวจ</Label><NativeSelect id="prediction-draw" value={drawId} disabled={loadingDraws || !draws.length} onChange={(event) => setDrawId(event.target.value)}>{loadingDraws ? <option value="">กำลังโหลดงวด...</option> : draws.length ? draws.map((draw) => <option key={draw.id} value={draw.id}>{new Date(`${draw.draw_date}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</option>) : <option value="">ยังไม่มีงวดถัดไป</option>}</NativeSelect></div><div className="space-y-2"><Label htmlFor="prediction-title">ชื่อชุดเลข</Label><Input id="prediction-title" maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น เลขจากทะเบียนรถ" /></div><div className="space-y-2"><Label htmlFor="prediction-numbers">เลข 2, 3 หรือ 6 หลัก</Label><Textarea id="prediction-numbers" required rows={4} value={numbers} onChange={(event) => setNumbers(event.target.value.replace(/[^\d,\s]/g, ""))} placeholder="17, 71, 417, 123456" /></div>{values.length ? <div className="flex flex-wrap gap-2">{values.map((value) => <Badge key={value} variant="outline" className="border-primary/20 text-primary"><Hash className="mr-1 size-3" />{value}</Badge>)}</div> : null}<Button type="submit" variant="gold" size="lg" className="w-full" disabled={!drawId || busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />} {busy ? "กำลังบันทึก..." : "ยืนยันเลขงวดนี้"}</Button>{message ? <p role="status" className="text-xs leading-5 text-primary">{message}</p> : null}</form></CardContent></Card>
    </div>
  );
}
