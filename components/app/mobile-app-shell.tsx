"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MoonStar, Plus, TicketCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { PostComposer } from "@/components/community/post-composer";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/dreams", label: "คลังฝัน", icon: MoonStar },
  { href: "/tickets", label: "สลากของฉัน", icon: TicketCheck },
  { href: "/profile", label: "โปรไฟล์", icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/tickets") return pathname === "/tickets" || pathname === "/predictions";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileAppShell({ children, userId }: { children: ReactNode; userId: string }) {
  const pathname = usePathname();

  return (
    <div className="mobile-shell min-h-dvh">
      <div className="page-surface min-h-dvh pb-safe-nav">{children}</div>

      <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[760px] border-t border-white/8 bg-background/96 px-2 pt-2 shadow-[0_-14px_36px_rgba(0,0,0,.34)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-end safe-bottom">
          {navItems.slice(0, 2).map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-muted-foreground transition-colors", active && "text-primary")}>
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <PostComposer userId={userId}>
            <button type="button" aria-label="สร้างโพสต์ชุมชน" className="soft-pulse mx-auto -mt-7 flex size-16 flex-col items-center justify-center rounded-full border-[5px] border-background bg-primary text-primary-foreground shadow-[0_12px_32px_rgba(216,181,104,.25)] transition-transform active:scale-95">
              <Plus className="size-7" strokeWidth={2.5} />
              <span className="sr-only">โพสต์</span>
            </button>
          </PostComposer>

          {navItems.slice(2).map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-muted-foreground transition-colors", active && "text-primary")}>
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
