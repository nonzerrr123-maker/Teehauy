import Link from "next/link";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function AnimatedWordmark({ className, compact = false, centered = false }: { className?: string; compact?: boolean; centered?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Teehuay หน้าหลัก"
      className={cn("teehuay-wordmark group relative inline-flex w-fit items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/60", !centered && "gap-2", className)}
    >
      <span className={cn("wordmark-shimmer font-display font-bold leading-none", compact ? "text-3xl" : "text-4xl")}>Teehuay</span>
      <span className={cn("wordmark-spark flex size-7 items-center justify-center rounded-full border border-primary/20 bg-primary/8 text-primary shadow-[0_0_24px_rgba(216,181,104,.14)] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 group-active:scale-95", centered && "absolute left-full ml-2")}>
        <Sparkles className="size-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
