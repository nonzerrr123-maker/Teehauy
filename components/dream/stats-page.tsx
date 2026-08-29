"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const sampleLotteryData = [
  { date: "01 ส.ค.", first: "593174", top: "74", bottom: "47" },
  { date: "16 ส.ค.", first: "827459", top: "59", bottom: "95" },
  { date: "01 ก.ค.", first: "341862", top: "62", bottom: "26" },
  { date: "16 ก.ค.", first: "905237", top: "37", bottom: "73" },
  { date: "01 มิ.ย.", first: "764823", top: "23", bottom: "32" },
  { date: "16 มิ.ย.", first: "128456", top: "56", bottom: "65" },
];

const digitFrequency = [
  { digit: "0", count: 18 },
  { digit: "1", count: 22 },
  { digit: "2", count: 19 },
  { digit: "3", count: 25 },
  { digit: "4", count: 21 },
  { digit: "5", count: 30 },
  { digit: "6", count: 17 },
  { digit: "7", count: 28 },
  { digit: "8", count: 23 },
  { digit: "9", count: 15 },
];

export function StatsPage() {
  const [view, setView] = useState<"table" | "chart">("table");

  return (
    <section className="fade-up flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-10">
        <h1 className="gold-text font-[Cinzel] text-xl font-bold">สถิติหวยย้อนหลัง</h1>
        <p className="mb-4 mt-1 text-xs text-[#6b7585]">ข้อมูลตัวอย่าง 6 งวด · รอเชื่อม API ผลรางวัลจริง</p>
        <div className="segmented flex rounded-xl p-1">
          <button type="button" data-active={view === "table"} onClick={() => setView("table")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">
            ⊞ ตาราง
          </button>
          <button type="button" data-active={view === "chart"} onClick={() => setView("chart")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">
            ◎ กราฟ
          </button>
        </div>
      </header>

      <div className="scroll-area flex-1 px-5 pb-5">
        {view === "table" ? (
          <div className="glass-card mb-5 overflow-hidden rounded-2xl">
            <div className="grid grid-cols-4 border-b border-[#c9a84c22] bg-[#1a1a2acc] px-3 py-2.5 text-center text-[9px] text-[#a8b8cc]">
              <span>งวด</span><span>รางวัลที่ 1</span><span>2 ตัวบน</span><span>2 ตัวล่าง</span>
            </div>
            {sampleLotteryData.map((row) => (
              <div key={row.date} className="grid grid-cols-4 items-center border-b border-[#a8b8cc0d] px-3 py-3 text-center text-xs last:border-0">
                <span className="text-[#6b7585]">{row.date}</span>
                <span className="font-[Cinzel] text-[11px] text-[#c8d4e0]">{row.first}</span>
                <span className="font-[Cinzel] font-bold text-[#f0c040]">{row.top}</span>
                <span className="font-[Cinzel] font-bold text-[#a8b8cc]">{row.bottom}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card mb-5 rounded-2xl p-3 pt-5">
            <p className="mb-4 px-1 text-xs text-[#a8b8cc]">ความถี่ตัวเลขจากชุดข้อมูลตัวอย่าง</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={digitFrequency} margin={{ top: 8, right: 2, left: -25, bottom: 0 }}>
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
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatNumbers title="เลขร้อน" icon="🔥" values={["74", "56", "35", "89", "27", "91"]} />
          <StatNumbers title="เลขเย็น" icon="❄️" values={["03", "68", "14", "50", "82", "37"]} muted />
        </div>
        <p className="mt-4 text-[10px] leading-4 text-[#454b5a]">
          หมายเหตุ: ข้อมูลในหน้านี้เป็นข้อมูลตัวอย่างสำหรับทดสอบ UI เท่านั้น และไม่ใช่ผลรางวัลจริง
        </p>
      </div>
    </section>
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
