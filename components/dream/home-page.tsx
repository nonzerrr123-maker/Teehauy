"use client";

import { useState } from "react";

import { quickCategories } from "@/lib/dream-catalog";
import { PageHeader } from "@/components/dream/common";

export function HomePage({
  onInterpret,
  isLoading,
  error,
}: {
  onInterpret: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}) {
  const [dreamText, setDreamText] = useState("");
  const valid = dreamText.trim().length >= 2;

  const submit = (text: string) => {
    if (isLoading) return;
    void onInterpret(text);
  };

  return (
    <section className="fade-up flex h-full flex-col">
      <PageHeader eyebrow="เปิดเผยโชคชะตา" title="ตีเลขฝัน" subtitle="เล่าความฝันของคุณ · เราจะตีเลขให้" />
      <div className="scroll-area flex-1 px-5 pb-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c9a84c44]" />
          <span className="text-[9px] text-[#c9a84c99]">◆ ◆ ◆</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c9a84c44]" />
        </div>

        <label className="mb-2.5 block font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">
          เล่าความฝันของคุณ
        </label>
        <div className="glass-card mb-4 overflow-hidden rounded-2xl focus-within:border-[#c9a84c77] focus-within:shadow-[0_0_28px_rgba(201,168,76,.1)]">
          <textarea
            value={dreamText}
            maxLength={300}
            rows={5}
            onChange={(event) => setDreamText(event.target.value)}
            placeholder="เช่น ฝันเห็นงูใหญ่สีทองขดอยู่ในบ้าน บินได้สูงมาก..."
            className="w-full resize-none bg-transparent px-4 pb-3 pt-4 text-[15px] leading-relaxed text-[#d4e0ee] outline-none placeholder:text-[#4a5060]"
          />
          <div className="flex items-center justify-between px-4 pb-3 text-xs text-[#4a5060]">
            <span>{dreamText.length} / 300 ตัวอักษร</span>
            {dreamText ? (
              <button type="button" onClick={() => setDreamText("")} className="rounded-full border border-[#6b758544] px-2 py-0.5 text-[#6b7585]">
                ล้าง
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-[#ff806044] bg-[#ff806010] px-3 py-2.5 text-xs leading-5 text-[#ff9d88]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!valid || isLoading}
          onClick={() => submit(dreamText.trim())}
          className="gold-button mb-6 w-full rounded-2xl py-4 font-[Cinzel] text-lg font-bold tracking-[.12em]"
        >
          {isLoading ? "✦ กำลังตีความ... ✦" : "✦ ตีเลขเดี๋ยวนี้ ✦"}
        </button>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">หมวดฝันยอดนิยม</h2>
          <span className="text-[11px] text-[#5c6474]">แตะเพื่อตีเลข</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {quickCategories.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={isLoading}
              title={item.desc}
              onClick={() => submit(`ฝันเห็น${item.label}`)}
              className="category-card flex flex-col items-center gap-1.5 rounded-xl py-3 disabled:opacity-50"
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-xs font-medium text-[#a8b8cc]">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-7 text-center font-[Cinzel] text-[9px] uppercase tracking-[.22em] text-[#292a38]">◆ เส้นทางแห่งโชคชะตา ◆</p>
      </div>
    </section>
  );
}
