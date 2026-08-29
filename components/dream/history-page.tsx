"use client";

import { useState } from "react";

import type { DreamResult } from "@/lib/dream-engine";

export function HistoryPage({
  results,
  favorites,
  isFavorite,
  onFavorite,
  onInterpret,
  isLoading,
}: {
  results: DreamResult[];
  favorites: DreamResult[];
  isFavorite: (result: DreamResult) => boolean;
  onFavorite: (result: DreamResult) => void;
  onInterpret: (text: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [view, setView] = useState<"history" | "favorites">("history");
  const list = view === "history" ? results : favorites;

  return (
    <section className="fade-up flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-10">
        <h1 className="gold-text mb-4 font-[Cinzel] text-xl font-bold">{view === "history" ? "ประวัติของฉัน" : "รายการโปรด"}</h1>
        <div className="segmented flex rounded-xl p-1">
          <button type="button" data-active={view === "history"} onClick={() => setView("history")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">
            ⏱ ประวัติ
          </button>
          <button type="button" data-active={view === "favorites"} onClick={() => setView("favorites")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">
            ★ รายการโปรด
          </button>
        </div>
      </header>

      <div className="scroll-area flex-1 px-5 pb-5">
        {!list.length ? (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1a2a] text-2xl">{view === "history" ? "📖" : "★"}</span>
            <p className="text-sm text-[#a8b8cc]">{view === "history" ? "ยังไม่มีประวัติ" : "ยังไม่มีรายการโปรด"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((result, index) => (
              <div key={`${result.dreamText}-${result.date}-${index}`} className="glass-card overflow-hidden rounded-2xl">
                <div className="p-4 pb-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void onInterpret(result.dreamText)}
                      className="min-w-0 flex-1 text-left disabled:opacity-60"
                    >
                      <p className="line-clamp-2 text-sm leading-5 text-[#c8d4e0]">“{result.dreamText}”</p>
                      <p className="mt-1 text-[10px] text-[#4a5060]">
                        {new Date(result.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </button>
                    <button type="button" onClick={() => onFavorite(result)} className="text-lg text-[#f0c040]" aria-label="สลับรายการโปรด">
                      {isFavorite(result) ? "★" : "☆"}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-[#a8b8cc12] bg-[#06060c55] px-4 py-2.5">
                  {result.numbers.slice(0, 3).map((number) => (
                    <span key={number.type} className="rounded-lg bg-[#1a1a2a] px-2.5 py-1 font-[Cinzel] text-xs font-bold text-[#d9c678]">
                      {number.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
