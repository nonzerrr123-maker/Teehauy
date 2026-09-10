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

type Payload = { ok: boolean; status?: "ready" | "insufficient_data"; sampleSize?: number; model?: string; results?: RankedNumber[]; disclaimer?: string };

export function AnalysisPage() {
  const [data, setData] = useState<Payload | null>(null);
  useEffect(() => { void fetch("/api/analysis/next", { cache: "no-store" }).then((response) => response.json()).then(setData).catch(() => setData({ ok: false })); }, []);
  if (!data) return <div className="space-y-3"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-52 w-full rounded-2xl" /></div>;
  if (!data.ok) return <Alert variant="destructive"><AlertDescription>ระบบวิเคราะห์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง</AlertDescription></Alert>;

  return (
    <div className="space-y-5">
      <Card><CardHeader className="flex flex-row items-center justify-between p-4 pb-2"><div><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="size-4 text-primary" /> โมเดลที่ใช้งาน</CardTitle><p className="mt-1 text-xs text-muted-foreground">{data.model}</p></div><Badge variant="secondary">{data.sampleSize ?? 0} งวด</Badge></CardHeader><CardContent className="p-4 pt-3"><div className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground"><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">50%</strong>ความถี่รวม</span><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">30%</strong>รายหลัก</span><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">20%</strong>ความใหม่</span></div></CardContent></Card>

      {data.status === "insufficient_data" ? <Alert variant="warning"><Database className="size-4" /><AlertDescription>ต้องมีผลทางการอย่างน้อย 6 งวดก่อนคำนวณ ตอนนี้มี {data.sampleSize ?? 0} งวด ระบบจะไม่สร้างข้อมูลตัวอย่างมาปะปน</AlertDescription><Button asChild variant="outline" size="sm" className="mt-3"><Link href="/stats">ดูสถานะข้อมูลทางการ</Link></Button></Alert> : <section><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-primary" /> เลขคะแนนสูง</h2><span className="text-[10px] text-muted-foreground">เรียงตามคะแนนโมเดล</span></div><div className="grid grid-cols-3 gap-3">{data.results?.map((item, index) => <Card key={item.value} className={index === 0 ? "border-primary/35 bg-primary/5" : undefined}><CardContent className="p-3 text-center"><span className="text-[10px] text-muted-foreground">อันดับ {index + 1}</span><strong className="my-1 block font-display text-3xl tracking-wider text-primary">{item.value}</strong><span className="text-[10px] text-muted-foreground">score {item.score.toFixed(3)}</span></CardContent></Card>)}</div></section>}

      <Alert><Info className="size-4" /><AlertDescription>{data.disclaimer ?? "การวิเคราะห์เป็นข้อมูลเพื่อความบันเทิง ไม่รับประกันผลรางวัล"}</AlertDescription></Alert>
    </div>
  );
}
