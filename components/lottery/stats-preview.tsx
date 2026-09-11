"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Database, LoaderCircle, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LotteryStats } from "@/lib/lottery-provider";

type StatsResponse = { ok: boolean; stats?: LotteryStats };

export function StatsPreview() {
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/lottery/stats", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as StatsResponse }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.ok || !payload.stats) throw new Error("STATS_UNAVAILABLE");
        if (active) setStats(payload.stats);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (!stats && !failed) return <Card className="mb-7"><CardContent className="flex items-center gap-3 p-4 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" /> กำลังโหลดข้อมูลผลรางวัลย้อนหลัง...</CardContent></Card>;
  if (failed) return <Card className="mb-7 border-destructive/20"><CardContent className="flex items-center gap-3 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><RefreshCw className="size-5" /></span><div><strong className="text-sm">โหลดสถิติไม่สำเร็จ</strong><p className="mt-0.5 text-xs text-muted-foreground">แตะหน้าสถิติเพื่อลองเชื่อมต่อใหม่</p></div><Button asChild variant="ghost" size="icon" className="ml-auto"><Link href="/stats" aria-label="เปิดหน้าสถิติ"><ArrowRight /></Link></Button></CardContent></Card>;

  const latest = stats?.draws[0];
  return (
    <Card className="mb-7 overflow-hidden border-primary/15">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{latest ? <BarChart3 className="size-5" /> : <Database className="size-5" />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><strong className="text-sm">สถิติผลรางวัล</strong><Badge variant={latest ? "default" : "secondary"}>{latest ? `${stats?.draws.length ?? 0} งวด` : "รอข้อมูล"}</Badge></div>
            {latest ? <p className="mt-1 text-xs text-muted-foreground">ล่าสุด {latest.date} · รางวัลที่ 1 <span className="font-semibold text-foreground">{latest.first}</span> · 2 ตัวล่าง <span className="font-semibold text-primary">{latest.bottom}</span></p> : <p className="mt-1 text-xs leading-5 text-muted-foreground">ยังไม่มีผลรางวัลที่ผ่านการตรวจสอบและพร้อมแสดง</p>}
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-between"><Link href="/stats">ดูสถิติและสถานะแหล่งข้อมูล <ArrowRight /></Link></Button>
      </CardContent>
    </Card>
  );
}
