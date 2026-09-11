"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle, Search, ShieldCheck, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { LotteryCheckResult } from "@/lib/lottery-checker";

type CheckerDraw = { id: string; draw_date: string; status: string };
type CheckResponse = { ok: true; result: LotteryCheckResult } | { ok: false; message: string };

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

export function LotteryChecker({ draws }: { draws: CheckerDraw[] }) {
  const [number, setNumber] = useState("");
  const [drawDate, setDrawDate] = useState("latest");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checked, setChecked] = useState<LotteryCheckResult | null>(null);
  const resultDraws = draws.filter((draw) => draw.status === "verified" || draw.status === "published").slice(0, 36);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(number)) {
      setMessage("กรอกเลขสลากให้ครบ 6 หลัก");
      setChecked(null);
      return;
    }
    setChecking(true);
    setMessage(null);
    setChecked(null);
    try {
      const response = await fetch("/api/lottery/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, date: drawDate }),
        cache: "no-store",
      });
      const payload = await response.json() as CheckResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "ตรวจสลากไม่สำเร็จ" : payload.message);
      setChecked(payload.result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ตรวจสลากไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="bg-primary/[.04] p-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-5 text-primary" /> ตรวจสลากครบทุกรางวัล</CardTitle>
          <p className="text-xs leading-5 text-muted-foreground">กรอกเลข 6 หลัก ระบบจะตรวจรางวัลที่ 1–5 รางวัลข้างเคียง เลขหน้า 3 ตัว เลขท้าย 3 ตัว และเลขท้าย 2 ตัว</p>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checker-number">เลขสลาก 6 หลัก</Label>
              <Input id="checker-number" inputMode="numeric" autoComplete="off" maxLength={6} value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g, ""))} placeholder="123456" className="h-14 text-center font-display text-2xl tracking-[.22em] tabular-nums" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checker-draw">งวดที่ต้องการตรวจ</Label>
              <NativeSelect id="checker-draw" value={drawDate} onChange={(event) => setDrawDate(event.target.value)}>
                <option value="latest">งวดล่าสุด</option>
                {resultDraws.map((draw) => <option key={draw.id} value={draw.draw_date}>{dateLabel(draw.draw_date)}</option>)}
              </NativeSelect>
            </div>
            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={checking || number.length !== 6}>
              {checking ? <LoaderCircle className="animate-spin" /> : <Search />} {checking ? "กำลังตรวจ..." : "ตรวจรางวัล"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {message ? <Alert variant="destructive"><AlertTitle>ตรวจไม่สำเร็จ</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}

      {checked ? (
        <Card className={checked.isWinner ? "border-success/35 bg-success/[.04]" : "border-border"}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
            <div className="flex gap-3">
              <span className={checked.isWinner ? "flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 text-success" : "flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"}>
                {checked.isWinner ? <CheckCircle2 className="size-6" /> : <XCircle className="size-6" />}
              </span>
              <div><CardTitle className="text-base">{checked.isWinner ? "ยินดีด้วย ถูกรางวัล" : "ไม่ถูกรางวัลในงวดนี้"}</CardTitle><p className="mt-1 text-xs text-muted-foreground">เลข {checked.number} · งวด {dateLabel(checked.drawDate)}</p></div>
            </div>
            <Badge variant={checked.isWinner ? "default" : "secondary"}>{checked.isWinner ? `${checked.winnings.length} รางวัล` : "ไม่ถูกรางวัล"}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            {checked.winnings.map((winning, index) => (
              <div key={`${winning.prizeType}-${winning.matchedNumber}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-success/20 bg-background/70 p-3">
                <div><strong className="block text-sm">{winning.name}</strong><span className="text-[11px] text-muted-foreground">เลขที่ตรง {winning.matchedNumber}</span></div>
                <strong className="font-display text-lg text-success">฿{winning.amount.toLocaleString("th-TH")}</strong>
              </div>
            ))}
            {checked.isWinner ? <div className="flex items-center justify-between border-t border-border pt-3"><span className="text-sm font-semibold">รวมเงินรางวัลต่อ 1 ใบ</span><strong className="font-display text-xl text-success">฿{checked.totalPrize.toLocaleString("th-TH")}</strong></div> : <p className="text-xs leading-5 text-muted-foreground">เก็บสลากไว้ตรวจสอบอีกครั้งกับประกาศของสำนักงานสลากกินแบ่งรัฐบาลก่อนทิ้งทุกครั้ง</p>}
            <Button asChild variant="outline" className="w-full"><a href={checked.sourceUrl} target="_blank" rel="noreferrer">ดูที่มาผลงวดนี้จาก RANLOTTO <ExternalLink /></a></Button>
          </CardContent>
        </Card>
      ) : null}

      <p className="px-2 text-center text-[10px] leading-4 text-muted-foreground">ผลตรวจใช้เพื่ออำนวยความสะดวก โปรดตรวจสอบกับประกาศของสำนักงานสลากกินแบ่งรัฐบาลก่อนใช้เป็นหลักฐานรับรางวัล</p>
    </div>
  );
}
