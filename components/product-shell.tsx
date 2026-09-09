import Link from "next/link";
import type { ReactNode } from "react";
import { StarsBackground } from "@/components/dream/common";

export function ProductShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="min-h-dvh bg-[#06060c] text-[#d4e0ee]"><div className="relative mx-auto flex min-h-dvh w-full max-w-[760px] flex-col overflow-hidden border-x border-[#c9a84c10] bg-[#080810]"><StarsBackground /><header className="relative z-10 flex items-start gap-3 border-b border-[#a8b8cc12] px-5 pb-5 pt-8"><Link href="/" aria-label="กลับหน้าหลัก" className="mt-1 rounded-xl border border-[#a8b8cc22] px-3 py-2 text-sm text-[#8f98aa]">‹</Link><div><h1 className="gold-text font-[Cinzel] text-2xl font-bold">{title}</h1><p className="mt-1 text-xs text-[#626b7c]">{subtitle}</p></div></header><div className="relative z-10 flex-1 px-5 py-5">{children}</div></div></main>;
}
