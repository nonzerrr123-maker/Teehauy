"use client";

import type { DreamResult } from "@/lib/dream-engine";

export function ResultsPage({
  result,
  favorite,
  onFavorite,
  onBack,
}: {
  result: DreamResult;
  favorite: boolean;
  onFavorite: () => void;
  onBack: () => void;
}) {
  const elementStyle: Record<string, string> = {
    ทอง: "border-[#c9a84c66] bg-[#c9a84c18] text-[#f0c040]",
    น้ำ: "border-[#58a6ff66] bg-[#58a6ff18] text-[#80c0ff]",
    ไฟ: "border-[#ff806066] bg-[#ff806018] text-[#ff8060]",
    ดิน: "border-[#c0906066] bg-[#c0906018] text-[#c09060]",
    ลม: "border-[#80d0c066] bg-[#80d0c018] text-[#80d0c0]",
  };

  const share = async () => {
    const text = `🔮 ตีเลขจากความฝัน\n“${result.dreamText}”\n\n${result.numbers
      .map((item) => `${item.label}: ${item.value}`)
      .join(" · ")}\n\n#ตีเลขฝัน`;

    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // User can cancel the native share sheet.
    }
  };

  return (
    <section className="fade-up flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-10">
        <button type="button" onClick={onBack} className="glass-card rounded-xl px-3 py-2 text-sm text-[#a8b8cc]">
          ← กลับ
        </button>
        <h1 className="gold-text font-[Cinzel] text-sm font-semibold">ผลการตีเลข</h1>
        <button
          type="button"
          onClick={onFavorite}
          aria-label="บันทึกรายการโปรด"
          className="glass-card flex h-10 w-10 items-center justify-center rounded-xl text-lg text-[#f0c040]"
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>

      <div className="scroll-area flex-1 px-5 pb-5">
        <div className="glass-card mb-5 rounded-2xl p-4">
          <p className="mb-2 font-[Cinzel] text-[10px] uppercase tracking-[.18em] text-[#6b7585]">ความฝันของคุณ</p>
          <p className="text-sm leading-relaxed text-[#c8d4e0]">“{result.dreamText}”</p>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">เลขมงคล</h2>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${elementStyle[result.luckyElement] ?? elementStyle.ทอง}`}>
            ธาตุ{result.luckyElement}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          {result.numbers.slice(0, 2).map((item) => (
            <div key={item.type} className="gold-card number-reveal rounded-2xl p-4 text-center">
              <p className="mb-1 text-[10px] uppercase tracking-[.16em] text-[#8c96a7]">{item.label}</p>
              <p className="gold-text font-[Cinzel] text-4xl font-black tracking-[.12em]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          {result.numbers.slice(2).map((item) => (
            <div key={item.type} className="glass-card rounded-2xl px-4 py-3 text-center">
              <p className="text-[10px] text-[#6b7585]">{item.label}</p>
              <p className="mt-1 font-[Cinzel] text-xl font-bold text-[#d9c678]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold text-[#c9a84c]">✦ คำตีความ</p>
          <p className="text-sm leading-6 text-[#aebaca]">{result.meaning}</p>
        </div>

        <button
          type="button"
          onClick={() => void share()}
          className="w-full rounded-2xl border border-[#c9a84c44] bg-[#c9a84c10] py-3.5 text-sm font-semibold text-[#d9c678]"
        >
          ↗ แชร์ผลการตีเลข
        </button>
        <p className="mt-4 text-center text-[10px] leading-4 text-[#464c5b]">
          ผลการตีเลขเป็นคอนเทนต์เพื่อความบันเทิง ไม่ใช่การรับประกันผลรางวัล
        </p>
      </div>
    </section>
  );
}
