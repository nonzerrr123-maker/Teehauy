"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, LoaderCircle, Plus, RefreshCw, Sparkles, Ticket } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

type Draw = { id: string; draw_date: string; status: string };
type Match = { id: number; match_kind: string; lottery_prizes: { prize_type: string; prize_amount: number } | null };
type Prediction = { id: string; title: string | null; source_type: string; created_at: string; lottery_draws: Draw | null; prediction_numbers: { id: number; number_value: string; number_kind: string; prediction_matches: Match[] }[] };
type SavedTicket = { id: string; ticket_number: string; quantity: number; lottery_draws: Draw | null; ticket_wins: { id: number; prize_amount: number }[] };

const sourceLabels: Record<string, string> = { dream: "จากความฝัน", post: "จากโพสต์", manual: "เพิ่มเอง", model: "แบบจำลอง" };
const kindLabels: Record<string, string> = { dream_two: "2 ตัว", derived_top_two: "2 ตัวบน", last_two: "2 ตัวล่าง", dream_three: "3 ตัว", front_three: "3 ตัวหน้า", last_three: "3 ตัวท้าย", six_digit_ticket: "6 หลัก" };

function dateLabel(value?: string) { return value ? new Date(`${value}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "ไม่ระบุงวด"; }

export function TicketsPage({ userId }: { userId: string }) {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [tickets, setTickets] = useState<SavedTicket[]>([]);
  const [drawId, setDrawId] = useState("");
  const [number, setNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [drawResponse, predictionResponse, ticketResponse] = await Promise.all([
      supabase.from("lottery_draws").select("id,draw_date,status").in("status", ["scheduled", "published", "verified"]).order("draw_date", { ascending: false }),
      supabase.from("user_predictions").select("id,title,source_type,created_at,lottery_draws(id,draw_date,status),prediction_numbers(id,number_value,number_kind,prediction_matches(id,match_kind,lottery_prizes(prize_type,prize_amount)))").eq("status", "submitted").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_tickets").select("id,ticket_number,quantity,lottery_draws(id,draw_date,status),ticket_wins(id,prize_amount)").order("created_at", { ascending: false }).limit(100),
    ]);
    if (drawResponse.error || predictionResponse.error || ticketResponse.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    const nextDraws = (drawResponse.data ?? []) as Draw[];
    setDraws(nextDraws);
    setDrawId((current) => nextDraws.some((draw) => draw.id === current && draw.status === "scheduled") ? current : nextDraws.find((draw) => draw.status === "scheduled")?.id ?? "");
    setPredictions((predictionResponse.data ?? []) as unknown as Prediction[]);
    setTickets((ticketResponse.data ?? []) as unknown as SavedTicket[]);
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const totals = useMemo(() => {
    const numbers = predictions.flatMap((prediction) => prediction.prediction_numbers);
    return { predictions: numbers.length, matches: numbers.filter((item) => item.prediction_matches.length).length, ticketWins: tickets.reduce((total, item) => total + item.ticket_wins.reduce((sum, win) => sum + Number(win.prize_amount), 0), 0) };
  }, [predictions, tickets]);

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(number)) return setMessage("เลขสลากต้องมี 6 หลัก");
    if (!drawId) return setMessage("เลือกงวดก่อนบันทึก");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return setMessage("จำนวนสลากต้องอยู่ระหว่าง 1-100 ใบ");
    setSaving(true); setMessage(null);
    const { error } = await createClient().from("user_tickets").upsert({ user_id: userId, draw_id: drawId, ticket_number: number, quantity }, { onConflict: "user_id,draw_id,ticket_number" });
    setSaving(false);
    if (error) return setMessage(`บันทึกไม่สำเร็จ: ${error.message}`);
    setNumber("");
    setMessage("บันทึกสลากแล้ว");
    await load();
  };

  if (loading) return <div className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-muted" /><div className="h-48 animate-pulse rounded-2xl bg-muted" /></div>;
  if (loadError) return <Alert variant="destructive"><AlertDescription>โหลดสลากของฉันไม่สำเร็จ กรุณาลองใหม่</AlertDescription><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { setLoading(true); void load(); }}><RefreshCw /> ลองใหม่</Button></Alert>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Summary label="เลขที่เก็บ" value={totals.predictions} /><Summary label="เลขที่ตรง" value={totals.matches} accent /><Summary label="รางวัลรวม" value={totals.ticketWins ? `฿${totals.ticketWins.toLocaleString("th-TH")}` : "—"} />
      </div>

      <Tabs defaultValue="predictions">
        <TabsList><TabsTrigger value="predictions">เลขที่ฉันตี</TabsTrigger><TabsTrigger value="tickets">สลากจริง</TabsTrigger></TabsList>
        <TabsContent value="predictions" className="space-y-3">
          <Button asChild variant="outline" className="w-full border-dashed"><Link href="/predictions"><Plus /> เพิ่มชุดเลขเอง</Link></Button>
          {predictions.map((prediction) => {
            const matches = prediction.prediction_numbers.filter((item) => item.prediction_matches.length).length;
            return <Card key={prediction.id}><CardHeader className="p-4 pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-sm">{prediction.title || "ชุดเลขของฉัน"}</CardTitle><p className="mt-1 text-[11px] text-muted-foreground">งวด {dateLabel(prediction.lottery_draws?.draw_date)} · {sourceLabels[prediction.source_type] ?? prediction.source_type}</p></div><Badge variant={matches ? "default" : "secondary"}>{matches ? `ตรง ${matches} เลข` : prediction.lottery_draws?.status === "verified" ? "ไม่ตรง" : "รอตรวจ"}</Badge></div></CardHeader><CardContent className="p-4 pt-2"><div className="flex flex-wrap gap-2">{prediction.prediction_numbers.map((item) => <span key={item.id} className={`rounded-xl border px-3 py-2 text-center ${item.prediction_matches.length ? "border-success/30 bg-success/10 text-success" : "border-primary/20 bg-primary/5 text-primary"}`}><strong className="block font-display text-lg tracking-wider">{item.number_value}</strong><small className="block text-[9px] opacity-70">{kindLabels[item.number_kind] ?? item.number_kind}</small></span>)}</div></CardContent></Card>;
          })}
          {!predictions.length ? <Empty icon={Sparkles} title="ยังไม่มีเลขที่ตี" detail="ตีเลขจากความฝันหรือโพสต์เลขในชุมชน เลขจะมาอยู่ที่นี่อัตโนมัติ" /> : null}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-base">เพิ่มสลากที่ซื้อจริง</CardTitle></CardHeader><CardContent><form onSubmit={submitTicket} className="space-y-3"><div className="space-y-2"><Label htmlFor="ticket-draw">งวด</Label><NativeSelect id="ticket-draw" value={drawId} disabled={!draws.some((draw) => draw.status === "scheduled")} onChange={(event) => setDrawId(event.target.value)}>{draws.some((draw) => draw.status === "scheduled") ? draws.filter((draw) => draw.status === "scheduled").map((draw) => <option key={draw.id} value={draw.id}>{dateLabel(draw.draw_date)}</option>) : <option value="">ยังไม่มีงวดที่เปิดรับสลาก</option>}</NativeSelect></div><div className="grid grid-cols-[1fr_82px] gap-3"><div className="space-y-2"><Label htmlFor="ticket-number">เลข 6 หลัก</Label><Input id="ticket-number" inputMode="numeric" maxLength={6} value={number} onChange={(event) => setNumber(event.target.value.replace(/\D/g, ""))} placeholder="123456" className="tabular-nums" /></div><div className="space-y-2"><Label htmlFor="ticket-quantity">จำนวนใบ</Label><Input id="ticket-quantity" type="number" min={1} max={100} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></div></div><Button type="submit" variant="gold" className="w-full" disabled={!drawId || saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Plus />} {saving ? "กำลังบันทึก..." : "บันทึกสลาก"}</Button>{message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}</form></CardContent></Card>
          {tickets.map((item) => <Card key={item.id}><CardContent className="flex items-center gap-3 p-4"><span className="flex size-11 items-center justify-center rounded-xl bg-secondary"><Ticket className="size-5 text-primary" /></span><div className="min-w-0 flex-1"><strong className="font-display text-xl tracking-[.15em] text-primary">{item.ticket_number}</strong><p className="text-[11px] text-muted-foreground">งวด {dateLabel(item.lottery_draws?.draw_date)} · {item.quantity} ใบ</p></div>{item.ticket_wins.length ? <CheckCircle2 className="size-5 text-success" /> : <Clock3 className="size-5 text-muted-foreground" />}</CardContent></Card>)}
          {!tickets.length ? <Empty icon={Ticket} title="ยังไม่ได้บันทึกสลาก" detail="สแกนหรือกรอกเลข 6 หลัก เพื่อรวมการตรวจผลไว้ในหน้าเดียว" /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) { return <div className="rounded-2xl border border-border bg-card px-2 py-3 text-center"><strong className={`block font-display text-xl ${accent ? "text-success" : "text-primary"}`}>{value}</strong><span className="text-[10px] text-muted-foreground">{label}</span></div>; }
function Empty({ icon: Icon, title, detail }: { icon: typeof Ticket; title: string; detail: string }) { return <Card><CardContent className="flex flex-col items-center py-12 text-center"><span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary"><Icon className="size-6 text-muted-foreground" /></span><strong className="text-sm">{title}</strong><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{detail}</p></CardContent></Card>; }
