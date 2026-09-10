"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, CircleAlert, LoaderCircle, RefreshCw, Save, Share2, Sparkles, Star } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
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
  const [sharePublicly, setSharePublicly] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const twoDigitNumbers = result.numbers.filter((item) => item.value.length === 2).slice(0, 6);
  const threeDigitNumbers = result.numbers.filter((item) => item.value.length === 3).slice(0, 6);
  const symbols = result.analysis?.symbols ?? [];
  const hasNumbers = twoDigitNumbers.length > 0 || threeDigitNumbers.length > 0;
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
    const { error } = await createClient().rpc("save_dream_prediction", {
      p_interpretation_id: result.id,
      p_draw_id: drawId,
      p_numbers: result.numbers,
      p_is_public: sharePublicly,
    });
    setSaving(false);
    if (error) return setSaveMessage(`บันทึกไม่สำเร็จ: ${error.message}`);
    setSaved(true);
    setSaveMessage(sharePublicly ? "บันทึกแล้ว และโพสต์ความฝันนี้ในชุมชนแบบสาธารณะ" : "เก็บเลขไว้ในสลากของฉันแบบส่วนตัวแล้ว ระบบจะเทียบผลให้อัตโนมัติ");
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
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">ผลจากคลังสัญลักษณ์</h2>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${elementStyle[result.luckyElement] ?? elementStyle.ทอง}`}>
            ธาตุ{result.luckyElement}
          </span>
        </div>

        {hasNumbers ? <>
          <NumberGrid title="เลข 2 ตัว · 6 อันดับ" items={twoDigitNumbers} accent />
          <NumberGrid title="เลข 3 ตัว · 6 อันดับ" items={threeDigitNumbers} />
        </> : <Alert variant="warning" className="mb-4"><CircleAlert className="size-4" /><AlertDescription>{result.meaning}</AlertDescription><Button type="button" variant="outline" size="sm" className="mt-3" onClick={onBack}>กลับไปเพิ่มรายละเอียด</Button></Alert>}

        {symbols.length ? <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="size-3.5" /> สัญลักษณ์ที่พบ</p>
          <div className="space-y-3">
            {symbols.slice(0, 5).map((symbol) => <div key={symbol.id} className="flex items-start gap-3">
              <span className={symbol.importance === "หลัก" ? "rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground" : "rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"}>{symbol.importance}</span>
              <div className="min-w-0 flex-1"><p className="text-xs font-semibold">{symbol.label} <span className="font-normal text-muted-foreground">· {symbol.category}</span></p><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{symbol.meaning}{symbol.contexts.length ? ` · บริบท: ${symbol.contexts.join(", ")}` : ""}</p></div>
            </div>)}
          </div>
        </div> : null}

        {result.analysis?.assumption ? <Alert variant="warning" className="mb-4"><CircleAlert className="size-4" /><AlertDescription>{result.analysis.assumption}</AlertDescription></Alert> : null}
        {result.analysis?.hasUnmatchedContent && !result.analysis.needsMoreDetail ? <p className="mb-4 rounded-xl border border-border bg-muted/50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">บางรายละเอียดอยู่นอกคลัง ระบบจึงใช้เฉพาะสัญลักษณ์และบริบทที่ระบุด้านบนในการจัดอันดับเลข</p> : null}

        {hasNumbers ? <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold text-primary">✦ คำตีความ</p>
          <p className="text-sm leading-6 text-muted-foreground">{result.meaning}</p>
        </div> : null}

        {hasNumbers ? <div className="mb-3 space-y-3 rounded-2xl border border-primary/20 bg-card p-4">
          <div><p className="text-sm font-semibold text-foreground">เก็บเลขไว้ตรวจงวดนี้</p><p className="mt-0.5 text-xs text-muted-foreground">เมื่อผลทางการยืนยัน ระบบจะเทียบชนิดเลขให้อัตโนมัติ</p></div>
          <NativeSelect value={drawId} onChange={(event) => setDrawId(event.target.value)} disabled={saved || drawsLoading || drawError}>{drawsLoading ? <option value="">กำลังโหลดงวด...</option> : draws.length ? draws.map((draw) => <option key={draw.id} value={draw.id}>งวด {new Date(`${draw.draw_date}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</option>) : <option value="">ยังไม่มีงวดที่เปิดรับเลข</option>}</NativeSelect>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <Switch id="share-dream-publicly" checked={sharePublicly} onCheckedChange={setSharePublicly} disabled={saved} aria-describedby="share-dream-help" />
            <div className="min-w-0 flex-1"><Label htmlFor="share-dream-publicly" className="cursor-pointer text-xs font-semibold">โพสต์ความฝันและเลขนี้แบบสาธารณะ</Label><p id="share-dream-help" className="mt-1 text-[11px] leading-5 text-muted-foreground">ปิดไว้เป็นค่าเริ่มต้น หากเปิด คนในชุมชนและผู้ติดตามจะเห็นข้อความฝัน คำตีความ และชุดเลขนี้</p></div>
          </div>
          {drawError ? <Alert variant="destructive"><AlertDescription>โหลดงวดไม่สำเร็จ</AlertDescription><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void loadDraws()}><RefreshCw /> ลองใหม่</Button></Alert> : null}
          <Button type="button" variant="gold" className="w-full" disabled={saving || saved || !drawId || !result.numbers.length} onClick={() => void saveForDraw()}>{saving ? <><LoaderCircle className="animate-spin" /> กำลังบันทึก...</> : saved ? <><Check /> บันทึกแล้ว</> : <><Save /> เก็บในสลากของฉัน</>}</Button>
          {saveMessage ? <p className="text-xs leading-5 text-muted-foreground">{saveMessage}</p> : null}
        </div> : null}

        <Button type="button" onClick={() => void share()} variant="outline" className="w-full"><Share2 /> แชร์ผลการตีเลข</Button>
        <p className="mt-4 text-center text-[10px] leading-4 text-muted-foreground">
          ผลการตีเลขเป็นคอนเทนต์เพื่อความบันเทิง ไม่ใช่การรับประกันผลรางวัล
        </p>
      </div>
    </section>
  );
}

function NumberGrid({ title, items, accent = false }: { title: string; items: DreamResult["numbers"]; accent?: boolean }) {
  if (!items.length) return null;
  return <section className="mb-5"><h3 className="mb-2 text-xs font-semibold text-foreground">{title}</h3><div className="grid grid-cols-3 gap-2">{items.map((item, index) => <div key={`${item.type}-${item.value}`} className={accent && index < 3 ? "gold-card number-reveal rounded-xl px-2 py-3 text-center" : "glass-card rounded-xl px-2 py-3 text-center"}><p className={accent && index < 3 ? "gold-text font-display text-2xl font-black tracking-[.08em]" : "font-display text-2xl font-bold tracking-[.06em] text-primary"}>{item.value}</p><p className="mt-1 line-clamp-2 min-h-7 text-[9px] leading-3.5 text-muted-foreground">จาก {item.source ?? item.label}</p></div>)}</div></section>;
}
