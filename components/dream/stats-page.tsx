"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, CalendarDays, Database, ExternalLink, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LotteryStats } from "@/lib/lottery-provider";

export type StatsTab = "results" | "charts" | "analysis";
type StatsApiResponse = { ok: boolean; stats?: LotteryStats };
const TAB_STORAGE_KEY = "teehuay:stats-tab:v1";
const AnalysisPage = dynamic(() => import("@/components/analysis/analysis-page").then((module) => module.AnalysisPage), { loading: DashboardFallback });
const StatisticsDashboard = dynamic(() => import("@/components/lottery/statistics-dashboard").then((module) => module.StatisticsDashboard), { loading: DashboardFallback });

export function StatsPage({ initialTab = "results", restoreSavedTab = false }: { initialTab?: StatsTab; restoreSavedTab?: boolean }) {
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [activeTab, setActiveTab] = useState<StatsTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/lottery/stats", { cache: "no-store" });
      const payload = await response.json() as StatsApiResponse;
      if (!response.ok || !payload.ok || !payload.stats) throw new Error("LOTTERY_STATS_UNAVAILABLE");
      setStats(payload.stats);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (restoreSavedTab) {
        const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
        if (saved === "results" || saved === "charts" || saved === "analysis") setActiveTab(saved);
      }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, restoreSavedTab]);

  const changeTab = (value: string) => {
    const nextTab = value as StatsTab;
    setActiveTab(nextTab);
    window.localStorage.setItem(TAB_STORAGE_KEY, nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", nextTab);
    window.history.replaceState(window.history.state, "", url);
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-52 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>;
  if (loadError || !stats) return <Alert variant="destructive"><AlertTitle>โหลดสถิติไม่สำเร็จ</AlertTitle><AlertDescription>ระบบติดต่อข้อมูลผลรางวัลไม่ได้ในขณะนี้</AlertDescription><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}><RefreshCw /> ลองใหม่</Button></Alert>;

  const hasDraws = stats.draws.length > 0;

  return (
    <div className="space-y-5">
      <Card className="border-primary/15">
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-2">
          <div><CardTitle className="flex items-center gap-2 text-sm"><Database className="size-4 text-primary" /> แหล่งข้อมูล</CardTitle><p className="mt-1 text-xs leading-5 text-muted-foreground">{stats.sourceLabel}</p></div>
          <Badge variant={hasDraws ? "default" : "secondary"}>{hasDraws ? `${stats.draws.length} งวด` : "รอผล"}</Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 p-4 pt-2">
          <p className="text-[11px] leading-4 text-muted-foreground">ยืนยันแล้ว {stats.verifiedDraws} งวด · คลังเผยแพร่ {stats.archiveDraws} งวด</p>
          <Button asChild variant="ghost" size="icon"><a href="https://www.ranlotto.com/developers" target="_blank" rel="noreferrer" aria-label="เปิดเอกสารแหล่งข้อมูล RANLOTTO"><ExternalLink /></a></Button>
        </CardContent>
      </Card>

      {!hasDraws ? <Alert variant="warning"><CalendarDays className="size-4" /><AlertTitle>ยังไม่มีผลย้อนหลังในระบบ</AlertTitle><AlertDescription>เมื่อผลทางการถูกนำเข้า ตาราง กราฟ และการวิเคราะห์จะปรากฏอัตโนมัติ</AlertDescription></Alert> : null}

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="results">ผลย้อนหลัง</TabsTrigger>
          <TabsTrigger value="charts" disabled={!hasDraws}>กราฟสถิติ</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!hasDraws}>วิเคราะห์งวดหน้า</TabsTrigger>
        </TabsList>
        <TabsContent value="results" className="space-y-3">
          {stats.draws.slice(0, 60).map((row) => <Card key={row.drawDate}><CardContent className="grid grid-cols-[1fr_auto_auto] items-center gap-4 p-4"><div><p className="text-[10px] text-muted-foreground">งวด {row.date}</p><strong className="mt-1 block font-display text-xl tracking-[.12em]">{row.first}</strong></div><ResultNumber label="2 ตัวบน" value={row.top} /><ResultNumber label="2 ตัวล่าง" value={row.bottom} accent /></CardContent></Card>)}
          {stats.draws.length > 60 ? <p className="px-2 text-center text-[11px] text-muted-foreground">ตารางแสดง 60 งวดล่าสุด ส่วนกราฟและการวิเคราะห์ใช้ข้อมูลย้อนหลังทั้ง {stats.draws.length} งวด</p> : null}
          {!hasDraws ? <EmptyResults /> : null}
        </TabsContent>
        <TabsContent value="charts">{hasDraws ? <StatisticsDashboard draws={stats.draws} /> : null}</TabsContent>
        <TabsContent value="analysis">{hasDraws ? <AnalysisPage /> : null}</TabsContent>
      </Tabs>
    </div>
  );
}

function ResultNumber({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="text-center"><span className="block text-[9px] text-muted-foreground">{label}</span><strong className={accent ? "font-display text-2xl text-primary" : "font-display text-2xl"}>{value}</strong></div>;
}

function EmptyResults() {
  return <Card><CardContent className="flex flex-col items-center py-14 text-center"><span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary"><BarChart3 className="size-6 text-muted-foreground" /></span><strong className="text-sm">ยังไม่มีงวดที่พร้อมแสดง</strong><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">ตารางจะแสดงเมื่อระบบได้รับข้อมูลผลรางวัล</p></CardContent></Card>;
}

function DashboardFallback() {
  return <div className="space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
}
