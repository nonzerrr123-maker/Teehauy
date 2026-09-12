"use client";

import { useMemo, useState } from "react";
import { Activity, Clock3, Hash, Repeat2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LotteryDraw } from "@/lib/lottery-provider";
import {
  buildExactNumberStats,
  buildPatternSummary,
  buildPositionFrequency,
  buildRollingTrend,
  filterDrawsByRange,
  type LotterySeries,
  type LotteryTimeRange,
} from "@/lib/lottery-statistics";

const RANGE_OPTIONS: { value: LotteryTimeRange; label: string }[] = [
  { value: "1y", label: "1 ปี" },
  { value: "5y", label: "5 ปี" },
  { value: "10y", label: "10 ปี" },
  { value: "all", label: "ทั้งหมด" },
];
const SERIES_OPTIONS: { value: LotterySeries; label: string; detail: string }[] = [
  { value: "top", label: "2 ตัวบน", detail: "สองหลักท้ายของรางวัลที่ 1" },
  { value: "bottom", label: "2 ตัวล่าง", detail: "รางวัลเลขท้าย 2 ตัว" },
  { value: "threeDigit", label: "3 ตัวบน", detail: "สามหลักท้ายของรางวัลที่ 1" },
];
const WINDOW_OPTIONS = [12, 24, 60];
const CHART_COLORS = { hundreds: "#f0c86b", tens: "#9c7bea", units: "#4bb6a8" };

export function StatisticsDashboard({ draws }: { draws: LotteryDraw[] }) {
  const [range, setRange] = useState<LotteryTimeRange>("1y");
  const [series, setSeries] = useState<LotterySeries>("top");
  const [windowSize, setWindowSize] = useState(24);
  const [selectedValues, setSelectedValues] = useState<Partial<Record<LotterySeries, string>>>({});

  const filteredDraws = useMemo(() => filterDrawsByRange(draws, range), [draws, range]);
  const positionFrequency = useMemo(() => buildPositionFrequency(filteredDraws, series), [filteredDraws, series]);
  const exact = useMemo(() => buildExactNumberStats(filteredDraws, series), [filteredDraws, series]);
  const patterns = useMemo(() => buildPatternSummary(filteredDraws, series), [filteredDraws, series]);
  const expectedLength = series === "threeDigit" ? 3 : 2;
  const selectedValue = selectedValues[series] ?? exact.hot[0]?.value ?? "";
  const validSelection = selectedValue.length === expectedLength && /^\d+$/.test(selectedValue);
  const trend = useMemo(
    () => validSelection ? buildRollingTrend(filteredDraws, series, selectedValue, windowSize) : [],
    [filteredDraws, series, selectedValue, validSelection, windowSize],
  );
  const currentSeries = SERIES_OPTIONS.find((option) => option.value === series) ?? SERIES_OPTIONS[0];
  const startDate = filteredDraws.at(-1)?.date;
  const endDate = filteredDraws[0]?.date;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div><CardTitle className="text-sm">เลือกชุดข้อมูล</CardTitle><p className="mt-1 text-[11px] leading-4 text-muted-foreground">แยกรางวัลคนละลำดับเวลา เพื่อไม่สร้างความสัมพันธ์ปลอม</p></div>
            <Badge variant="secondary">{filteredDraws.length} งวด</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {SERIES_OPTIONS.map((option) => <Button key={option.value} type="button" size="sm" variant={series === option.value ? "default" : "outline"} onClick={() => setSeries(option.value)}>{option.label}</Button>)}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {RANGE_OPTIONS.map((option) => <Button key={option.value} type="button" size="sm" variant={range === option.value ? "secondary" : "ghost"} onClick={() => setRange(option.value)}>{option.label}</Button>)}
          </div>
          <p className="text-[10px] leading-4 text-muted-foreground">{currentSeries.detail} · {startDate && endDate ? `${startDate} – ${endDate}` : "ไม่มีข้อมูลในช่วงนี้"} · ช่วงเวลานับย้อนหลังจากงวดล่าสุดในฐานข้อมูล</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">ความถี่ตัวเลขแยกรายหลัก</CardTitle></CardHeader>
        <CardContent className="p-3 pt-4">
          <div className="h-72 w-full" aria-label={`กราฟความถี่ ${currentSeries.label}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positionFrequency} margin={{ top: 4, right: 2, left: -25, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="digit" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--primary) 6%, transparent)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {series === "threeDigit" ? <Bar name="หลักร้อย" dataKey="hundreds" fill={CHART_COLORS.hundreds} radius={[4, 4, 0, 0]} /> : null}
                <Bar name="หลักสิบ" dataKey="tens" fill={CHART_COLORS.tens} radius={[4, 4, 0, 0]} />
                <Bar name="หลักหน่วย" dataKey="units" fill={CHART_COLORS.units} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberRanking title="ออกบ่อยในช่วงนี้" detail="เรียงจากจำนวนครั้ง แล้วดูความล่าสุด" values={exact.hot} />
        <NumberRanking title="ห่างหายนาน" detail="เฉพาะเลขที่เคยออก เรียงตามจำนวนงวดที่หายไป" values={exact.overdue} overdue />
      </div>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Activity className="size-4 text-primary" /> รูปแบบของเลข</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 p-4 pt-2 sm:grid-cols-4">
          <PatternMetric icon={Hash} label="ลงท้ายเลขคู่" value={`${patterns.evenEndingPercent}%`} />
          <PatternMetric icon={Activity} label="ตัวเลข 5–9" value={`${patterns.highDigitPercent}%`} />
          <PatternMetric icon={Repeat2} label="มีเลขซ้ำในชุด" value={`${patterns.repeatedDigitPercent}%`} />
          <PatternMetric icon={Clock3} label="ผลรวมเฉลี่ย" value={String(patterns.averageDigitSum)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">แนวโน้มเลขที่เลือก</CardTitle>
          <p className="text-[11px] leading-4 text-muted-foreground">จำนวนครั้งที่เลขนี้ปรากฏในหน้าต่างเลื่อนย้อนหลัง ไม่ใช่โอกาสถูกรางวัล</p>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2">
          <div className="flex gap-2">
            <Input value={selectedValue} inputMode="numeric" maxLength={expectedLength} aria-label={`เลข ${expectedLength} หลักที่ต้องการดูแนวโน้ม`} onChange={(event) => setSelectedValues((current) => ({ ...current, [series]: event.target.value.replace(/\D/g, "").slice(0, expectedLength) }))} className="font-display text-lg tracking-[.2em]" />
            <div className="grid shrink-0 grid-cols-3 gap-1">
              {WINDOW_OPTIONS.map((value) => <Button key={value} type="button" size="sm" variant={windowSize === value ? "secondary" : "ghost"} onClick={() => setWindowSize(value)}>{value}</Button>)}
            </div>
          </div>
          {trend.length ? <div className="h-64 w-full" aria-label={`กราฟแนวโน้มเลข ${selectedValue}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 8, right: 8, left: -30, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="date" minTickGap={42} axisLine={false} tickLine={false} tickFormatter={formatChartDate} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip labelFormatter={(label) => `งวด ${formatFullDate(String(label))}`} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 }} /><Line name={`จำนวนครั้งใน ${windowSize} งวด`} type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div> : <div className="rounded-xl bg-secondary/60 px-4 py-10 text-center text-xs text-muted-foreground">กรอกเลขให้ครบ {expectedLength} หลัก และเลือกช่วงที่มีอย่างน้อย {windowSize} งวด</div>}
          <p className="text-[10px] text-muted-foreground">หน้าต่าง {windowSize} งวด · จุดล่าสุดนับจากผล {windowSize} งวดก่อนหน้าในช่วงที่เลือก</p>
        </CardContent>
      </Card>
    </div>
  );
}

function NumberRanking({ title, detail, values, overdue = false }: { title: string; detail: string; values: ReturnType<typeof buildExactNumberStats>["hot"]; overdue?: boolean }) {
  return <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm">{title}</CardTitle><p className="text-[10px] leading-4 text-muted-foreground">{detail}</p></CardHeader><CardContent className="grid grid-cols-3 gap-2 p-4 pt-2">{values.map((item) => <div key={item.value} className="rounded-xl bg-secondary/65 p-2 text-center"><strong className="block font-display text-lg tracking-wider text-primary">{item.value}</strong><span className="block text-[9px] text-muted-foreground">{overdue ? `หาย ${item.gap} งวด` : `${item.count} ครั้ง`}</span></div>)}</CardContent></Card>;
}

function PatternMetric({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return <div className="rounded-xl bg-secondary/65 p-3"><Icon className="mb-2 size-4 text-primary" /><strong className="block font-display text-xl">{value}</strong><span className="text-[10px] text-muted-foreground">{label}</span></div>;
}

function formatChartDate(value: string) {
  const [year, month] = value.split("-");
  return `${month}/${year.slice(-2)}`;
}

function formatFullDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
