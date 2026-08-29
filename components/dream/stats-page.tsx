"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { LotteryStats } from "@/lib/lottery-provider";

type StatsApiResponse = {
  ok: boolean;
  stats?: LotteryStats;
};

export function StatsPage() {
  const [view, setView] = useState<"table" | "chart">("table");
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    void fetch("/api/lottery/stats", { cache: "no-store" })
      .then(async (response) => ({ response, payload: (await response.json()) as StatsApiResponse }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.ok || !payload.stats) throw new Error("LOTTERY_STATS_UNAVAILABLE");
        setStats(payload.stats);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  const sourceText = stats?.source === "external"
    ? stats.sourceLabel
    : stats?.sourceLabel ?? "กำลังโหลดข้อมูล...";

  return (
    <section className="fade-up flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="gold-text font-[Cinzel] text-xl font-bold">สถิติหวยย้อนหลัง</h1>
            <p className="mt-1 text-xs text-[#6b7585]">{sourceText}</p>
          </div>
          {stats ? (
            <span className={`mt-1 shrink-0 rounded-full border px-2 py-1 text-[9px] ${stats.source === "external" ? "border-[#80d0c044] text-[#80d0c0]" : "border-[#c9a84c44] text-[#d9c678]"}`}>
              {stats.source === "external" ? "LIVE SOURCE" : "SAMPLE"}
            </span>
          ) : null}
        </div>

        <div className="segmented mt-4 flex rounded-xl p-1">
          <button type="button" data-active={view === "table"} onClick={() => setView("table")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">
            ⊞ ตาราง
          </button>
          <button type="button" data-active={view === "chart"} onClick={() => setView("chart")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">
            ◎ กราฟ
          </button>
        </div>
      </header>

      <div className="scroll-area flex-1 px-5 pb-5">
        {loadError ? (
          <div className="glass-card mb-4 rounded-2xl border-[#ff806033] p-4 text-sm text-[#ff9d88]">
            โหลดสถิติไม่สำเร็จในขณะนี้ กรุณาลองใหม่ภายหลัง
          </div>
        ) : null}

        {!stats && !loadError ? <StatsSkeleton /> : null}

        {stats && view === "table" ? (
          <div className="glass-card mb-5 overflow-hidden rounded-2xl">
            <div className="grid grid-cols-4 border-b border-[#c9a84c22] bg-[#1a1a2acc] px-3 py-2.5 text-center text-[9px] text-[#a8b8cc]">
              <span>งวด</span><span>รางวัลที่ 1</span><span>2 ตัวบน</span><span>2 ตัวล่าง</span>
            </div>
            {stats.draws.map((row, index) => (
              <div key={`${row.date}-${index}`} className="grid grid-cols-4 items-center border-b border-[#a8b8cc0d] px-3 py-3 text-center text-xs last:border-0">
                <span className="text-[#6b7585]">{row.date}</span>
                <span className="font-[Cinzel] text-[11px] text-[#c8d4e0]">{row.first}</span>
                <span className="font-[Cinzel] font-bold text-[#f0c040]">{row.top}</span>
                <span className="font-[Cinzel] font-bold text-[#a8b8cc]">{row.bottom}</span>
              </div>
            ))}
          </div>
        ) : null}

        {stats && view === "chart" ? (
          <div className="glass-card mb-5 rounded-2xl p-3 pt-5">
            <p className="mb-4 px-1 text-xs text-[#a8b8cc]">ความถี่ตัวเลขจากข้อมูลที่โหลดได้</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.digitFrequency} margin={{ top: 8, right: 2, left: -25, bottom: 0 }}>
                  <XAxis dataKey="digit" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(201,168,76,.06)" }}
                    contentStyle={{ background: "#13131f", border: "1px solid rgba(201,168,76,.3)", borderRadius: 12, color: "#d4e0ee", fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#c9a84c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {stats ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatNumbers title="เลขที่พบบ่อย" icon="🔥" values={stats.hotNumbers} />
              <StatNumbers title="เลขที่พบน้อย" icon="❄️" values={stats.coldNumbers} muted />
            </div>
            <p className="mt-4 text-[10px] leading-4 text-[#454b5a]">
              {stats.source === "sample"
                ? "หมายเหตุ: ตอนนี้ provider ยังใช้ข้อมูลตัวอย่างเพื่อทดสอบ UI ไม่ใช่ผลรางวัลจริง"
                : "สถิติคำนวณจากข้อมูลที่ provider ส่งมา ไม่ใช่การทำนายผลรางวัลในอนาคต"}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}

function StatsSkeleton() {
  return (
    <div className="glass-card mb-5 rounded-2xl p-4">
      <div className="mb-3 h-3 w-28 animate-pulse rounded bg-[#252536]" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-8 animate-pulse rounded-xl bg-[#171725]" />)}
      </div>
    </div>
  );
}

function StatNumbers({ title, icon, values, muted = false }: { title: string; icon: string; values: string[]; muted?: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-3.5">
      <p className="mb-3 text-xs font-semibold text-[#a8b8cc]">{icon} {title}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {values.map((value) => (
          <span key={value} className={`rounded-lg bg-[#06060c66] py-1.5 text-center font-[Cinzel] text-xs font-bold ${muted ? "text-[#7f8999]" : "text-[#f0c040]"}`}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
