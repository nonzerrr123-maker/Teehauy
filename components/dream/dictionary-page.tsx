"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/dream/common";
import { dictionaryEntries } from "@/lib/dream-catalog";

export function DictionaryPage({
  onInterpret,
  isLoading,
}: {
  onInterpret: (text: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [expanded, setExpanded] = useState<string | null>(null);

  const categories = useMemo(
    () => ["ทั้งหมด", ...Array.from(new Set(dictionaryEntries.map((item) => item.category)))],
    [],
  );

  const filtered = useMemo(
    () =>
      dictionaryEntries.filter(
        (item) =>
          (category === "ทั้งหมด" || item.category === category) &&
          (!search || `${item.name} ${item.meaning} ${item.numbers}`.includes(search.trim())),
      ),
    [category, search],
  );

  return (
    <section className="fade-up flex h-full flex-col">
      <PageHeader title="คลังฝัน" subtitle="ค้นหาความหมายและเลขจากสัญลักษณ์ในฝัน" />
      <div className="scroll-area flex-1 px-5 pb-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหา เช่น งู, น้ำ, 74..."
          className="glass-card mb-3 w-full rounded-2xl px-4 py-3 text-sm text-[#d4e0ee] outline-none placeholder:text-[#4a5060]"
        />

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              data-active={category === item}
              onClick={() => setCategory(item)}
              className="chip shrink-0 rounded-full px-3 py-1.5 text-xs"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => {
            const open = expanded === item.name;
            const luckClass = item.luck === "สูง" ? "text-[#f0c040]" : item.luck === "กลาง" ? "text-[#a8b8cc]" : "text-[#6b7585]";

            return (
              <div key={item.name} className="glass-card overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : item.name)}
                  className="flex w-full items-center gap-3 p-3.5 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#222235] text-xl">{item.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-[#d4e0ee]">{item.name}</strong>
                      <span className={`text-[10px] ${luckClass}`}>โชค{item.luck}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#6b7585]">{item.meaning}</span>
                  </span>
                  <span className="text-xs text-[#4a5060]">{open ? "⌃" : "⌄"}</span>
                </button>

                {open ? (
                  <div className="border-t border-[#a8b8cc12] px-4 pb-4 pt-3">
                    <p className="text-xs leading-5 text-[#a8b8cc]">{item.meaning}</p>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-[#06060c66] px-3 py-2.5">
                      <span className="font-[Cinzel] text-base font-bold text-[#f0c040]">{item.numbers}</span>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void onInterpret(`ฝันเห็น${item.name}`)}
                        className="rounded-lg border border-[#c9a84c44] px-2.5 py-1.5 text-[11px] text-[#d9c678] disabled:opacity-50"
                      >
                        {isLoading ? "กำลังตี..." : "ตีเลขนี้"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {!filtered.length ? <div className="py-16 text-center text-sm text-[#596071]">ไม่พบคำในคลังฝัน</div> : null}
        </div>
      </div>
    </section>
  );
}
