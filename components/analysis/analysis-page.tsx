"use client";

import { useEffect, useState } from "react";
import { BarChart3, Database, FlaskConical, Info, ShieldCheck, TrendingUp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RankedNumber } from "@/lib/lottery-analysis";
import type { MarkovEvaluation } from "@/lib/lottery-markov";

type Payload = {
  ok: boolean;
  status?: "ready" | "insufficient_data";
  sampleSize?: number;
  twoDigitResults?: RankedNumber[];
  threeDigitResults?: RankedNumber[];
  markovEvaluation?: MarkovEvaluation;
  disclaimer?: string;
};

export function AnalysisPage() {
  const [data, setData] = useState<Payload | null>(null);
  useEffect(() => { void fetch("/api/analysis/next", { cache: "no-store" }).then((response) => response.json()).then(setData).catch(() => setData({ ok: false })); }, []);
  if (!data) return <div className="space-y-3"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-52 w-full rounded-2xl" /></div>;
  if (!data.ok) return <Alert variant="destructive"><AlertDescription>ระบบวิเคราะห์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง</AlertDescription></Alert>;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
          <div><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="size-4 text-primary" /> คะแนนแนวโน้มย้อนหลัง</CardTitle><p className="mt-1 text-xs leading-5 text-muted-foreground">จัดอันดับจากความถี่ เลขเด่นรายหลัก และความใกล้กับงวดล่าสุด</p></div>
          <Badge variant="secondary" className="shrink-0">{data.sampleSize ?? 0} งวด</Badge>
        </CardHeader>
        <CardContent className="p-4 pt-3"><div className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground"><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">50%</strong>ความถี่เลขตรง</span><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">30%</strong>ความถี่รายหลัก</span><span className="rounded-xl bg-secondary p-2"><strong className="block text-sm text-foreground">20%</strong>ความล่าสุด</span></div></CardContent>
      </Card>

      {data.status === "insufficient_data"
        ? <Alert variant="warning"><Database className="size-4" /><AlertDescription>ต้องมีผลย้อนหลังอย่างน้อย 6 งวดก่อนคำนวณ ตอนนี้มี {data.sampleSize ?? 0} งวด</AlertDescription></Alert>
        : <>
            <RankingSection title="เลข 2 ตัว 6 อันดับแรก" detail="คำนวณจาก 2 ตัวบนและ 2 ตัวล่าง โดยไม่ต่อสองชุดเป็นลำดับเวลาเดียวกัน" results={data.twoDigitResults ?? []} />
            <RankingSection title="เลข 3 ตัวบน 6 อันดับแรก" detail="สามหลักท้ายของรางวัลที่ 1 งวดละหนึ่งค่า" results={data.threeDigitResults ?? []} />
          </>}

      {data.markovEvaluation ? <MarkovLab evaluation={data.markovEvaluation} /> : null}
      <Alert><Info className="size-4" /><AlertDescription>{data.disclaimer ?? "การวิเคราะห์เป็นข้อมูลเพื่อความบันเทิง ไม่รับประกันผลรางวัล"}</AlertDescription></Alert>
    </div>
  );
}

function RankingSection({ title, detail, results }: { title: string; detail: string; results: RankedNumber[] }) {
  return <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-primary" /> {title}</h2><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div><span className="shrink-0 text-[10px] text-muted-foreground">คะแนนสูงไปต่ำ</span></div><div className="grid grid-cols-3 gap-2">{results.map((item, index) => <Card key={item.value} className={index === 0 ? "border-primary/35 bg-primary/5" : undefined}><CardContent className="p-3 text-center"><span className="text-[10px] text-muted-foreground">อันดับ {index + 1}</span><strong className="my-1 block font-display text-2xl tracking-wider text-primary">{item.value}</strong><span className="block truncate text-[9px] text-muted-foreground">{item.frequency ? `เคยออก ${item.frequency} ครั้ง` : "เด่นจากความถี่รายหลัก"}</span></CardContent></Card>)}</div></section>;
}

function MarkovLab({ evaluation }: { evaluation: MarkovEvaluation }) {
  const significant = evaluation.diagnostics.filter((item) => item.adjustedPValue < 0.05).length;
  const strongest = [...evaluation.diagnostics].sort((a, b) => a.adjustedPValue - b.adjustedPValue)[0];
  const maxRate = Math.max(...evaluation.benchmark.map((item) => item.hitRate), 1);
  return (
    <Card className="border-primary/15">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-sm"><FlaskConical className="size-4 text-primary" /> ห้องทดลอง Markov</CardTitle><p className="mt-1 text-[11px] leading-4 text-muted-foreground">ทดสอบรายหลักของ 2 ตัวบน 2 ตัวล่าง และ 3 ตัวบนแยกกัน</p></div><Badge variant={evaluation.markovEligible ? "default" : "secondary"}>{evaluation.markovEligible ? "ผ่านเกณฑ์ทดลอง" : "ยังไม่ใช้จริง"}</Badge></div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-2">
        <div className="rounded-xl bg-secondary/60 p-3"><div className="mb-1 flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><strong className="text-xs">ตรวจความสัมพันธ์ข้ามงวด</strong></div><p className="text-[11px] leading-5 text-muted-foreground">พบ {significant} จาก {evaluation.diagnostics.length} หลักที่ผ่านการปรับการทดสอบซ้ำ{strongest ? ` · ค่า q ต่ำสุด ${strongest.adjustedPValue.toFixed(4)}` : ""}</p></div>
        <div>
          <div className="mb-2 flex items-end justify-between gap-3"><div><strong className="text-xs">Walk-forward Hit@6</strong><p className="mt-0.5 text-[10px] text-muted-foreground">ฝึกจากอดีต แล้วทายงวดถัดไปทีละงวด รวม {evaluation.validationDraws} การทดสอบ</p></div><span className="text-[9px] text-muted-foreground">สูงไม่ได้แปลว่าถูกงวดหน้า</span></div>
          <div className="space-y-2">{evaluation.benchmark.map((item) => <div key={item.model} className="grid grid-cols-[9rem_1fr_auto] items-center gap-2 text-[10px]"><span className="truncate text-muted-foreground">{item.label}</span><span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (item.hitRate / maxRate) * 100)}%` }} /></span><strong className="w-12 text-right">{item.hitRate.toFixed(2)}%</strong></div>)}</div>
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">{evaluation.conclusion}</p>
      </CardContent>
    </Card>
  );
}
