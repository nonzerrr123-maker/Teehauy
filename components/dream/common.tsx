"use client";

import { useMemo } from "react";

export type DreamTab = "home" | "dictionary" | "history" | "stats" | "profile";

export const navItems: { id: DreamTab; icon: string; label: string }[] = [
  { id: "home", icon: "✦", label: "หน้าหลัก" },
  { id: "dictionary", icon: "☽", label: "คลังฝัน" },
  { id: "history", icon: "◈", label: "ประวัติ" },
  { id: "stats", icon: "◎", label: "สถิติ" },
  { id: "profile", icon: "◉", label: "โปรไฟล์" },
];

export function StarsBackground() {
  const stars = useMemo(
    () => Array.from({ length: 54 }, (_, i) => ({
      id: i,
      x: (i * 37 + 11) % 100,
      y: (i * 61 + 7) % 100,
      size: i % 8 === 0 ? 2.2 : i % 3 === 0 ? 1.5 : 1,
      delay: `${(i % 10) * 0.42}s`,
      duration: `${3 + (i % 5) * 0.65}s`,
    })),
    [],
  );

  return (
    <div className="stars-bg" aria-hidden="true">
      {stars.map((star) => (
        <span
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            background: star.size > 2 ? "rgba(240,192,64,.75)" : "rgba(212,224,238,.5)",
            ["--delay" as string]: star.delay,
            ["--duration" as string]: star.duration,
          }}
        />
      ))}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="shrink-0 px-5 pb-4 pt-10 text-center">
      {eyebrow ? <p className="mb-1 font-[Cinzel] text-[10px] uppercase tracking-[.3em] text-[#6b7585]">{eyebrow}</p> : null}
      <h1 className="gold-text font-[Cinzel] text-2xl font-bold">{title}</h1>
      {subtitle ? <p className="mt-1 text-xs text-[#6b7585]">{subtitle}</p> : null}
    </header>
  );
}

export function BottomNav({ activeTab, onChange }: { activeTab: DreamTab; onChange: (tab: DreamTab) => void }) {
  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 py-2.5">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-active={active}
              className="nav-item relative flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-1 py-1.5"
              onClick={() => onChange(item.id)}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              <span className="h-1">{active ? <span className="nav-dot block" /> : null}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
