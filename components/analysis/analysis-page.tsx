"use client";
import { useEffect, useState } from "react";
import type { RankedNumber } from "@/lib/lottery-analysis";
type Payload = { ok: boolean; status?: "ready" | "insufficient_data"; sampleSize?: number; model?: string; results?: RankedNumber[]; disclaimer?: string };
export function AnalysisPage() {
  const [data, setData] = useState<Payload | null>(null);
  useEffect(() => { void fetch("/api/analysis/next", { cache: "no-store" }).then((r) => r.json()).then(setData).catch(() => setData({ ok: false })); }, []);
  if (!data) return <div className="glass-card rounded-2xl p-5 text-sm text-[#687183]">กำลังวิเคราะห์ข้อมูลย้อนหลัง...</div>;
  if (!data.ok) return <div className="glass-card rounded-2xl p-5 text-sm text-[#ff9d88]">ระบบวิเคราะห์ยังไม่พร้อม</div>;
  return <div className="space-y-4"><div className="glass-card rounded-2xl p-4"><p className="text-xs text-[#687183]">โมเดล</p><p className="mt-1 text-sm text-[#e1c96f]">{data.model}</p><p className="mt-3 text-xs text-[#8b94a5]">ความถี่ 50% · ความถี่ตามหลัก 30% · ความใหม่ 20% · {data.sampleSize} งวด</p></div>{data.status === "insufficient_data" ? <div className="rounded-2xl border border-[#c9a84c33] p-4 text-sm text-[#d6b867]">ต้องมีผลจริงอย่างน้อย 6 งวดก่อนแสดงผล ตอนนี้มี {data.sampleSize} งวด และระบบจะไม่สร้างเลขตัวอย่างมาปะปน</div> : <div className="grid grid-cols-3 gap-3">{data.results?.map((item, index) => <div key={item.value} className="gold-card rounded-2xl p-3 text-center"><span className="text-[10px]">อันดับ {index + 1}</span><strong className="block text-2xl text-[#f0c040]">{item.value}</strong><span className="text-[10px]">{item.score.toFixed(3)}</span></div>)}</div>}<p className="text-[11px] text-[#505768]">{data.disclaimer}</p></div>;
}
