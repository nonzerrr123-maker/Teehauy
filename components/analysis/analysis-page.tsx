"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Database, Info, TrendingUp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RankedNumber } from "@/lib/lottery-analysis";

type Payload = { ok: boolean; status?: "ready" | "insufficient_data"; sampleSize?: number; twoDigitResults?: RankedNumber[]; threeDigitResults?: RankedNumber[]; disclaimer?: string };

export function AnalysisPage() {
  const [data, setData] = useState<Payload | null>(null);
  useEffect(() => { void fetch("/api/analysis/next", { cache: "no-store" }).then((response) => response.json()).then(setData).catch(() => setData({ ok: false })); }, []);
  if (!data) return <div className="space-y-3"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-52 w-full rounded-2xl" /></div>;
  if (!data.ok) return <Alert variant="destructive"><AlertDescription>ระบบวิเคราะห์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง</AlertDescription></Alert>;

  return (
    <div className="space-y-5">
      <Card><CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2"><div><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="size-4 text-primary" /> วิธีจัดอันดับ</CardTitle><p className="mt-1 text-xs leading-5 text-muted-foreground">ไม่ใช่ Markov chain ระบบไม่ได้ทำนายการเปลี่ยนจากงวดหนึ่งไปอีกงวด แต่รวมสัญญาณจากผลย้อนหลัง</p></div><Badge variant="secondary" className="shrink-0">{data.sampleSize ?? 0} งวด</Badge></CardHeader><CardContent className="p-4 pt-3"><div className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground"><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">50%</strong>เลขตรงเคยออก</span><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">30%</strong>ความถี่รายหลัก</span><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">20%</strong>ความใกล้งวดล่าสุด</span></div></CardContent></Card>

      {data.status === "insufficient_data" ? <Alert variant="warning"><Database className="size-4" /><AlertDescription>ต้องมีผลทางการอย่างน้อย 6 งวดก่อนคำนวณ ตอนนี้มี {data.sampleSize ?? 0} งวด</AlertDescription><Button asChild variant="outline" size="sm" className="mt-3"><Link href="/stats">ดูสถานะข้อมูลทางการ</Link></Button></Alert> : <><RankingSection title="เลข 2 ตัว 6 อันดับแรก" detail="รางวัลที่ 1 สองหลักท้าย + เลขท้าย 2 ตัว" results={data.twoDigitResults ?? []} /><RankingSection title="เลข 3 ตัว 6 อันดับแรก" detail="เลขหน้า 3 ตัว + เลขท้าย 3 ตัว" results={data.threeDigitResults ?? []} /></>}

      <Alert><Info className="size-4" /><AlertDescription>{data.disclaimer ?? "การวิเคราะห์เป็นข้อมูลเพื่อความบันเทิง ไม่รับประกันผลรางวัล"}</AlertDescription></Alert>
    </div>
  );
}

function RankingSection({ title, detail, results }: { title: string; detail: string; results: RankedNumber[] }) {
  return <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-primary" /> {title}</h2><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div><span className="shrink-0 text-[10px] text-muted-foreground">คะแนนสูงไปต่ำ</span></div><div className="grid grid-cols-3 gap-2">{results.map((item, index) => <Card key={item.value} className={index === 0 ? "border-primary/35 bg-primary/5" : undefined}><CardContent className="p-3 text-center"><span className="text-[10px] text-muted-foreground">อันดับ {index + 1}</span><strong className="my-1 block font-display text-2xl tracking-wider text-primary">{item.value}</strong><span className="block truncate text-[9px] text-muted-foreground">{item.frequency ? `เคยออก ${item.frequency} ครั้ง` : "เด่นจากความถี่รายหลัก"}</span></CardContent></Card>)}</div></section>;
}
