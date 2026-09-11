"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, CalendarDays, Database, ExternalLink, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LotteryStats } from "@/lib/lottery-provider";

type StatsApiResponse = { ok: boolean; stats?: LotteryStats };

export function StatsPage() {
  const [stats, setStats] = useState<LotteryStats | null>(null);
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

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

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

      {!hasDraws ? <Alert variant="warning"><CalendarDays className="size-4" /><AlertTitle>ยังไม่มีผลย้อนหลังในระบบ</AlertTitle><AlertDescription>ขณะนี้มีเพียงงวดถัดไปที่เปิดรับเลข เมื่อผลทางการถูกนำเข้าและยืนยัน ตาราง กราฟ และการวิเคราะห์จะปรากฏอัตโนมัติ</AlertDescription></Alert> : null}

      <Tabs defaultValue="table">
        <TabsList><TabsTrigger value="table">ตารางผล</TabsTrigger><TabsTrigger value="chart" disabled={!hasDraws}>กราฟความถี่</TabsTrigger></TabsList>
        <TabsContent value="table" className="space-y-3">
          {stats.draws.slice(0, 60).map((row) => <Card key={row.drawDate}><CardContent className="grid grid-cols-[1fr_auto_auto] items-center gap-4 p-4"><div><p className="text-[10px] text-muted-foreground">งวด {row.date}</p><strong className="mt-1 block font-display text-xl tracking-[.12em]">{row.first}</strong></div><ResultNumber label="2 ตัวบน" value={row.top} /><ResultNumber label="2 ตัวล่าง" value={row.bottom} accent /></CardContent></Card>)}
          {stats.draws.length > 60 ? <p className="px-2 text-center text-[11px] text-muted-foreground">ตารางแสดง 60 งวดล่าสุด ส่วนกราฟและการวิเคราะห์ใช้ข้อมูลย้อนหลังทั้ง {stats.draws.length} งวด</p> : null}
          {!hasDraws ? <Card><CardContent className="flex flex-col items-center py-14 text-center"><span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary"><BarChart3 className="size-6 text-muted-foreground" /></span><strong className="text-sm">ยังไม่มีงวดที่พร้อมแสดง</strong><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">ระบบตั้งใจเว้นว่างจนกว่าจะมีข้อมูลทางการ เพื่อไม่ให้ผู้ใช้เข้าใจผิดว่าเป็นผลจริง</p></CardContent></Card> : null}
        </TabsContent>
        <TabsContent value="chart">
          <Card><CardContent className="p-4"><p className="mb-4 text-xs text-muted-foreground">จำนวนครั้งที่ตัวเลขปรากฏในรางวัลที่ 1 และเลขท้าย 2 ตัวของ {stats.draws.length} งวด</p><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.digitFrequency} margin={{ top: 8, right: 2, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="digit" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: "color-mix(in srgb, var(--primary) 6%, transparent)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 }} /><Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
        </TabsContent>
      </Tabs>

      {hasDraws ? <div className="grid grid-cols-2 gap-3"><StatNumbers title="เลขที่พบบ่อย" values={stats.hotNumbers} /><StatNumbers title="เลขที่พบน้อย" values={stats.coldNumbers} muted /></div> : null}
      <Button asChild variant="outline" className="w-full"><Link href="/analysis">ไปหน้าวิเคราะห์งวดหน้า</Link></Button>
    </div>
  );
}

function ResultNumber({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="text-center"><span className="block text-[9px] text-muted-foreground">{label}</span><strong className={accent ? "font-display text-2xl text-primary" : "font-display text-2xl"}>{value}</strong></div>; }

function StatNumbers({ title, values, muted = false }: { title: string; values: string[]; muted?: boolean }) { return <Card><CardContent className="p-3"><p className="mb-3 text-xs font-semibold">{title}</p><div className="grid grid-cols-3 gap-1.5">{values.map((value) => <span key={value} className={muted ? "rounded-lg bg-secondary py-1.5 text-center font-display text-xs font-bold text-muted-foreground" : "rounded-lg bg-primary/8 py-1.5 text-center font-display text-xs font-bold text-primary"}>{value}</span>)}</div></CardContent></Card>; }
