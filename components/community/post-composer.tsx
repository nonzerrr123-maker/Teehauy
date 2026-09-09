"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Hash, LoaderCircle, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Draw = { id: string; draw_date: string; status: string };
type ParsedNumber = { value: string; kind: "dream_two" | "dream_three" | "six_digit_ticket" };

function parseNumbers(value: string): ParsedNumber[] {
  const unique = [...new Set(value.match(/(?<!\d)\d{2}(?:\d{1}|\d{4})?(?!\d)/g) ?? [])];
  return unique.slice(0, 20).map((number) => ({
    value: number,
    kind: number.length === 2 ? "dream_two" : number.length === 3 ? "dream_three" : "six_digit_ticket",
  }));
}

function drawLabel(date: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00+07:00`));
}

export function PostComposer({ children, userId }: { children: ReactNode; userId: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawId, setDrawId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const numbers = useMemo(() => parseNumbers(body), [body]);

  useEffect(() => {
    if (!open || draws.length) return;
    let active = true;
    void createClient().from("lottery_draws").select("id, draw_date, status").eq("status", "scheduled").order("draw_date").limit(12).then(({ data }) => {
      if (!active) return;
      const next = (data ?? []) as Draw[];
      setDraws(next);
      setDrawId(next.find((draw) => draw.status === "scheduled")?.id ?? next[0]?.id ?? "");
    });
    return () => { active = false; };
  }, [draws.length, open]);

  const submit = async () => {
    const normalized = body.trim();
    if (!normalized) return setMessage("เขียนเรื่องราวก่อนโพสต์");
    if (numbers.length && !drawId) return setMessage("เลือกงวดสำหรับชุดเลขนี้");
    setBusy(true);
    setMessage(null);
    const { error } = await createClient().rpc("create_community_post", {
      p_body: normalized,
      p_draw_id: numbers.length ? drawId : null,
      p_numbers: numbers,
    });
    setBusy(false);
    if (error) return setMessage(`โพสต์ไม่สำเร็จ: ${error.message}`);
    setBody("");
    setOpen(false);
    window.dispatchEvent(new Event("teehauy:post-created"));
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) setMessage(null); }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /> เล่าฝัน แชร์เลข</SheetTitle>
          <SheetDescription>โพสต์ของคุณจะอยู่ในชุมชน และเลขที่พบจะถูกเก็บใน “สลากของฉัน” ตามงวดที่เลือก</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-5 pb-4">
          <div className="space-y-2">
            <Label htmlFor="community-post">เรื่องราวหรือชุดเลข</Label>
            <Textarea id="community-post" rows={6} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="เมื่อคืนฝันเห็นเรือสีทอง เลขที่ตีได้ 17, 71 และ 417..." />
            <div className="flex justify-between text-[11px] text-muted-foreground"><span>ระบบจะจับเฉพาะเลข 2, 3 และ 6 หลัก</span><span>{body.length}/2,000</span></div>
          </div>

          {numbers.length ? (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Hash className="size-4 text-primary" /> เลขที่พบ {numbers.length} ชุด</div>
              <div className="flex flex-wrap gap-2">{numbers.map((item) => <Badge key={`${item.kind}-${item.value}`} variant="outline" className="border-primary/25 bg-background text-primary">{item.value}</Badge>)}</div>
              <div className="space-y-2">
                <Label htmlFor="composer-draw">บันทึกเข้ากับงวด</Label>
                <NativeSelect id="composer-draw" value={drawId} onChange={(event) => setDrawId(event.target.value)}>
                  {draws.map((draw) => <option key={draw.id} value={draw.id}>{drawLabel(draw.draw_date)}{draw.status === "scheduled" ? " · งวดถัดไป" : ""}</option>)}
                </NativeSelect>
              </div>
            </div>
          ) : null}

          {message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null}
          <Button type="button" variant="gold" size="lg" className="w-full" disabled={busy || !body.trim()} onClick={() => void submit()}>
            {busy ? <><LoaderCircle className="animate-spin" /> กำลังโพสต์...</> : "โพสต์เข้าชุมชน"}
          </Button>
          <p className="text-center text-[10px] leading-4 text-muted-foreground">เพื่อความบันเทิงเท่านั้น โปรดไม่เผยแพร่ข้อมูลส่วนตัวหรือชักชวนเล่นพนัน</p>
          <span className="sr-only">ผู้โพสต์ {userId}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
