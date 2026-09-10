"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, RefreshCw, Save, Share2, Star } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { createClient } from "@/lib/supabase/client";
import type { DreamResult } from "@/lib/dream-engine";

type Draw = { id: string; draw_date: string };

export function ResultsPage({
  result,
  favorite,
  onFavorite,
  onBack,
}: {
  result: DreamResult;
  favorite: boolean;
  onFavorite: () => void;
  onBack: () => void;
}) {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawId, setDrawId] = useState("");
  const [drawsLoading, setDrawsLoading] = useState(true);
  const [drawError, setDrawError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const elementStyle: Record<string, string> = {
    ทอง: "border-[#c9a84c66] bg-[#c9a84c18] text-[#f0c040]",
    น้ำ: "border-[#58a6ff66] bg-[#58a6ff18] text-[#80c0ff]",
    ไฟ: "border-[#ff806066] bg-[#ff806018] text-[#ff8060]",
    ดิน: "border-[#c0906066] bg-[#c0906018] text-[#c09060]",
    ลม: "border-[#80d0c066] bg-[#80d0c018] text-[#80d0c0]",
  };

  const loadDraws = useCallback(async () => {
    setDrawsLoading(true);
    setDrawError(false);
    const { data, error } = await createClient().from("lottery_draws").select("id, draw_date").eq("status", "scheduled").order("draw_date").limit(6);
    if (error) {
      setDrawError(true);
      setDrawsLoading(false);
      return;
    }
    const next = (data ?? []) as Draw[];
    setDraws(next);
    setDrawId(next[0]?.id ?? "");
    setDrawsLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void loadDraws(); }, 0); return () => window.clearTimeout(timer); }, [loadDraws]);

  const saveForDraw = async () => {
    if (!result.id) return setSaveMessage("ผลนี้มาจากโหมดออฟไลน์ จึงยังเก็บเข้ารอบงวดไม่ได้");
    if (!drawId) return setSaveMessage("ยังไม่มีงวดถัดไปในระบบ");
    setSaving(true);
    setSaveMessage(null);
    const { error } = await createClient().rpc("save_dream_prediction", { p_interpretation_id: result.id, p_draw_id: drawId, p_numbers: result.numbers });
    setSaving(false);
    if (error) return setSaveMessage(`บันทึกไม่สำเร็จ: ${error.message}`);
    setSaved(true);
    setSaveMessage("เก็บเลขไว้ในสลากของฉันแล้ว ระบบจะเทียบผลให้อัตโนมัติ");
  };

  const share = async () => {
    const text = `🔮 ตีเลขจากความฝัน\n“${result.dreamText}”\n\n${result.numbers
      .map((item) => `${item.label}: ${item.value}`)
      .join(" · ")}\n\n#ตีเลขฝัน`;

    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // User can cancel the native share sheet.
    }
  };

  return (
    <section className="page-enter flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-10">
        <Button type="button" onClick={onBack} variant="outline" size="sm"><ArrowLeft /> กลับ</Button>
        <h1 className="gold-text font-display text-sm font-semibold">ผลการตีเลข</h1>
        <Button
          type="button"
          onClick={onFavorite}
          aria-label="บันทึกรายการโปรด"
          variant="outline"
          size="icon"
          className="text-primary"
        ><Star fill={favorite ? "currentColor" : "none"} /></Button>
      </div>

      <div className="scroll-area flex-1 px-5 pb-5">
        <div className="glass-card mb-5 rounded-2xl p-4">
          <p className="mb-2 font-display text-[10px] uppercase tracking-[.18em] text-muted-foreground">ความฝันของคุณ</p>
          <p className="text-sm leading-relaxed text-foreground">“{result.dreamText}”</p>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">เลขมงคล</h2>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${elementStyle[result.luckyElement] ?? elementStyle.ทอง}`}>
            ธาตุ{result.luckyElement}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          {result.numbers.slice(0, 2).map((item) => (
            <div key={item.type} className="gold-card number-reveal rounded-2xl p-4 text-center">
              <p className="mb-1 text-[10px] uppercase tracking-[.16em] text-muted-foreground">{item.label}</p>
              <p className="gold-text font-display text-4xl font-black tracking-[.12em]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          {result.numbers.slice(2).map((item) => (
            <div key={item.type} className="glass-card rounded-2xl px-4 py-3 text-center">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-xl font-bold text-primary">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold text-primary">✦ คำตีความ</p>
          <p className="text-sm leading-6 text-muted-foreground">{result.meaning}</p>
        </div>

        <div className="mb-3 space-y-3 rounded-2xl border border-primary/20 bg-card p-4">
          <div><p className="text-sm font-semibold text-foreground">เก็บเลขไว้ตรวจงวดนี้</p><p className="mt-0.5 text-xs text-muted-foreground">เมื่อผลทางการยืนยัน ระบบจะเทียบชนิดเลขให้อัตโนมัติ</p></div>
          <NativeSelect value={drawId} onChange={(event) => setDrawId(event.target.value)} disabled={saved || drawsLoading || drawError}>{drawsLoading ? <option value="">กำลังโหลดงวด...</option> : draws.length ? draws.map((draw) => <option key={draw.id} value={draw.id}>งวด {new Date(`${draw.draw_date}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</option>) : <option value="">ยังไม่มีงวดที่เปิดรับเลข</option>}</NativeSelect>
          {drawError ? <Alert variant="destructive"><AlertDescription>โหลดงวดไม่สำเร็จ</AlertDescription><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void loadDraws()}><RefreshCw /> ลองใหม่</Button></Alert> : null}
          <Button type="button" variant="gold" className="w-full" disabled={saving || saved || !drawId} onClick={() => void saveForDraw()}>{saving ? <><LoaderCircle className="animate-spin" /> กำลังบันทึก...</> : saved ? <><Check /> บันทึกแล้ว</> : <><Save /> เก็บในสลากของฉัน</>}</Button>
          {saveMessage ? <p className="text-xs leading-5 text-muted-foreground">{saveMessage}</p> : null}
        </div>

        <Button type="button" onClick={() => void share()} variant="outline" className="w-full"><Share2 /> แชร์ผลการตีเลข</Button>
        <p className="mt-4 text-center text-[10px] leading-4 text-muted-foreground">
          ผลการตีเลขเป็นคอนเทนต์เพื่อความบันเทิง ไม่ใช่การรับประกันผลรางวัล
        </p>
      </div>
    </section>
  );
}
