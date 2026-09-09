import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/app/mobile-app-shell";

export function ProductShell({ title, subtitle, children, userId, backHref, action }: { title: string; subtitle?: string; children: ReactNode; userId: string; backHref?: string; action?: ReactNode }) {
  return (
    <MobileAppShell userId={userId}>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/88 px-5 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          {backHref ? <Link href={backHref} aria-label="กลับ" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"><ChevronLeft className="size-5" /></Link> : null}
          <div className="min-w-0 flex-1"><h1 className="font-display text-[1.6rem] font-bold leading-tight text-foreground">{title}</h1>{subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p> : null}</div>
          {action}
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6">{children}</div>
    </MobileAppShell>
  );
}
