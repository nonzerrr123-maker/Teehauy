"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BarChart3, BookHeart, MessageCircle, Sparkles, TicketCheck } from "lucide-react";

import { AnimatedWordmark } from "@/components/brand/animated-wordmark";
import { StatsPreview } from "@/components/lottery/stats-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { quickCategories } from "@/lib/dream-catalog";

export function HomePage({ onInterpret, isLoading, error }: { onInterpret: (text: string) => Promise<void>; isLoading: boolean; error: string | null }) {
  const [dreamText, setDreamText] = useState("");
  const submit = (text: string) => { if (!isLoading && text.trim().length >= 2) void onInterpret(text.trim()); };

  return (
    <main className="page-enter mx-auto w-full max-w-2xl px-4 pb-5 pt-[max(env(safe-area-inset-top),1.5rem)] sm:px-6">
      <header className="mb-6">
        <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[.22em] text-primary">Dream to number</p><AnimatedWordmark compact /></div>
      </header>

      <section className="mb-7">
        <div className="mb-3"><h2 className="text-xl font-bold">เมื่อคืนฝันว่าอะไร?</h2><p className="mt-1 text-sm text-muted-foreground">เล่าคน สัตว์ สิ่งของ เหตุการณ์ สี และจำนวนที่จำได้ ระบบจะตีความร่วมกัน</p></div>
        <Card className="overflow-hidden border-primary/20 shadow-[0_22px_70px_rgba(0,0,0,.22)]">
          <CardContent className="p-4">
            <Textarea value={dreamText} maxLength={300} rows={5} onChange={(event) => setDreamText(event.target.value)} placeholder="เช่น ฝันเห็นงูใหญ่สีทองเลื้อยเข้าบ้าน..." className="min-h-32 resize-none border-0 bg-transparent px-0 pt-0 text-base shadow-none focus-visible:ring-0" />
            <div className="mb-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground"><span>ยิ่งเล่าละเอียด ยิ่งอธิบายที่มาของเลขได้ดี</span><span>{dreamText.length}/300</span></div>
            <Button type="button" variant="gold" size="lg" className="w-full" disabled={dreamText.trim().length < 2 || isLoading} onClick={() => submit(dreamText)}>
              <Sparkles /> {isLoading ? "กำลังตีความ..." : "ตีเลขจากความฝัน"}
            </Button>
          </CardContent>
        </Card>
        {error ? <Alert variant="destructive" className="mt-3"><AlertDescription>{error}</AlertDescription></Alert> : null}
      </section>

      <StatsPreview />

      <section className="mb-7">
        <div className="mb-3 flex items-end justify-between"><div><h2 className="font-semibold">ฝันยอดนิยม</h2><p className="text-xs text-muted-foreground">แตะเพื่อดูคำตีความทันที</p></div><Link href="/dreams" className="flex items-center gap-1 text-xs font-semibold text-primary">ดูคลังฝัน <ArrowRight className="size-3.5" /></Link></div>
        <div className="grid grid-cols-4 gap-2">
          {quickCategories.slice(0, 8).map((item) => <Button key={item.label} type="button" variant="outline" disabled={isLoading} onClick={() => submit(`ฝันเห็น${item.label}`)} className="h-auto min-h-20 flex-col gap-1 rounded-2xl bg-card px-1 font-normal hover:border-primary/30"><span className="text-2xl">{item.emoji}</span><span className="text-xs text-muted-foreground">{item.label}</span></Button>)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">ทางลัดของคุณ</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink href="/tickets" icon={TicketCheck} title="สลากของฉัน" detail="รวมเลขและผลตรวจ" />
          <QuickLink href="/analysis" icon={BarChart3} title="วิเคราะห์งวดหน้า" detail="ข้อมูลย้อนหลัง" />
          <QuickLink href="/community" icon={MessageCircle} title="ชุมชน" detail="ดูเลขจากสมาชิก" />
          <QuickLink href="/dreams" icon={BookHeart} title="ประวัติความฝัน" detail="ฝันและรายการโปรด" />
        </div>
      </section>
      <p className="mt-7 text-center text-[10px] leading-4 text-muted-foreground">การวิเคราะห์ทั้งหมดเป็นข้อมูลเพื่อความบันเทิง โปรดเล่นอย่างรับผิดชอบ</p>
    </main>
  );
}

function QuickLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof TicketCheck; title: string; detail: string }) {
  return <Link href={href} className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"><Icon className="mb-3 size-5 text-primary" /><strong className="block text-sm">{title}</strong><span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span></Link>;
}
