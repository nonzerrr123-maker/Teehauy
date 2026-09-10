"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Eye, LockKeyhole, RefreshCw, Sparkles, Ticket, UserCheck, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  bio: string | null;
  created_at: string;
};

type Draw = { draw_date: string; status: string };
type Prediction = {
  id: string;
  title: string | null;
  source_type: string;
  created_at: string;
  lottery_draws: Draw | null;
  prediction_numbers: { id: number; number_value: string; number_kind: string }[];
};
type Dream = {
  id: string;
  dream_text: string;
  created_at: string;
  dream_interpretations: {
    id: string;
    meaning: string;
    lucky_element: string;
    numbers: { label?: string; value?: string }[];
  }[];
};
type SharedTicket = { id: string; ticket_number: string; created_at: string; lottery_draws: Draw | null };

const sourceLabels: Record<string, string> = {
  dream: "จากความฝัน",
  post: "จากโพสต์",
  manual: "เพิ่มเอง",
  model: "แบบจำลอง",
};

function drawDate(value?: string) {
  return value
    ? new Date(`${value}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    : "ไม่ระบุงวด";
}

export function PublicProfilePage({ viewerId, profileUserId }: { viewerId: string; profileUserId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [tickets, setTickets] = useState<SharedTicket[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [profileResult, predictionResult, dreamResult, ticketResult, followersResult, followingResult, relationshipResult] = await Promise.all([
      supabase.from("profiles").select("display_name,username,avatar_path,bio,created_at").eq("id", profileUserId).single(),
      supabase.from("user_predictions").select("id,title,source_type,created_at,lottery_draws(draw_date,status),prediction_numbers(id,number_value,number_kind)").eq("user_id", profileUserId).eq("is_public", true).eq("status", "submitted").order("created_at", { ascending: false }).limit(50),
      supabase.from("dreams").select("id,dream_text,created_at,dream_interpretations(id,meaning,lucky_element,numbers)").eq("user_id", profileUserId).eq("visibility", "public").order("created_at", { ascending: false }).limit(30),
      supabase.from("user_tickets").select("id,ticket_number,created_at,lottery_draws(draw_date,status)").eq("user_id", profileUserId).neq("visibility", "private").order("created_at", { ascending: false }).limit(50),
      supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profileUserId),
      supabase.from("user_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profileUserId),
      supabase.from("user_follows").select("following_id").eq("follower_id", viewerId).eq("following_id", profileUserId).maybeSingle(),
    ]);

    if (profileResult.error || predictionResult.error || dreamResult.error || ticketResult.error || followersResult.error || followingResult.error || relationshipResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    setProfile(profileResult.data as Profile);
    setPredictions((predictionResult.data ?? []) as unknown as Prediction[]);
    setDreams((dreamResult.data ?? []) as unknown as Dream[]);
    setTickets((ticketResult.data ?? []) as unknown as SharedTicket[]);
    setFollowers(followersResult.count ?? 0);
    setFollowing(followingResult.count ?? 0);
    setIsFollowing(Boolean(relationshipResult.data));
    setLoadError(false);
    setLoading(false);
  }, [profileUserId, viewerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const toggleFollow = async () => {
    if (profileUserId === viewerId) return;
    setFollowBusy(true);
    setMessage(null);
    const supabase = createClient();
    const result = isFollowing
      ? await supabase.from("user_follows").delete().eq("follower_id", viewerId).eq("following_id", profileUserId)
      : await supabase.from("user_follows").insert({ follower_id: viewerId, following_id: profileUserId });
    setFollowBusy(false);
    if (result.error) {
      setMessage(isFollowing ? "เลิกติดตามไม่สำเร็จ" : "ติดตามไม่สำเร็จ");
      return;
    }
    setIsFollowing((current) => !current);
    setFollowers((current) => Math.max(0, current + (isFollowing ? -1 : 1)));
    await load();
  };

  if (loading) return <div className="space-y-3"><div className="h-64 animate-pulse rounded-2xl bg-muted" /><div className="h-48 animate-pulse rounded-2xl bg-muted" /></div>;
  if (loadError || !profile) return <Card><CardContent className="flex flex-col items-center py-14 text-center"><strong className="text-sm">ไม่พบหรือโหลดโปรไฟล์นี้ไม่สำเร็จ</strong><p className="mt-1 text-xs text-muted-foreground">ลองกลับไปหน้าชุมชนแล้วเปิดโปรไฟล์อีกครั้ง</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => { setLoading(true); void load(); }}><RefreshCw /> ลองใหม่</Button></CardContent></Card>;

  const avatarUrl = profile.avatar_path
    ? createClient().storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : undefined;
  const isSelf = profileUserId === viewerId;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-primary/15">
        <div className="h-24 bg-[radial-gradient(circle_at_25%_0%,color-mix(in_srgb,var(--primary)_22%,transparent),transparent_55%),linear-gradient(135deg,var(--accent),var(--card))]" />
        <CardContent className="relative px-5 pb-5">
          <Avatar className="-mt-12 size-24 border-4 border-card"><AvatarImage src={avatarUrl} /><AvatarFallback className="text-2xl">{profile.display_name.slice(0, 1)}</AvatarFallback></Avatar>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="truncate text-xl font-bold">{profile.display_name}</h2><p className="mt-0.5 text-xs text-muted-foreground">{profile.username ? `@${profile.username}` : "สมาชิก Teehauy"}</p></div>
            {isSelf ? <Button asChild variant="outline" size="sm"><Link href="/profile">แก้ไขโปรไฟล์</Link></Button> : <Button type="button" variant={isFollowing ? "secondary" : "gold"} size="sm" disabled={followBusy} onClick={() => void toggleFollow()}>{isFollowing ? <UserCheck /> : <UserPlus />}{isFollowing ? "ติดตามแล้ว" : "ติดตาม"}</Button>}
          </div>
          {profile.bio ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{profile.bio}</p> : null}
          <div className="mt-4 flex items-center gap-4 text-xs"><span><strong className="text-foreground">{followers}</strong> <span className="text-muted-foreground">ผู้ติดตาม</span></span><span><strong className="text-foreground">{following}</strong> <span className="text-muted-foreground">กำลังติดตาม</span></span></div>
          {message ? <p className="mt-3 text-xs text-destructive">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" /><p>หน้านี้แสดงเฉพาะสิ่งที่เจ้าของเลือกแชร์ ความฝันส่วนตัวและสลากที่ตั้งเป็นส่วนตัวจะไม่ปรากฏ แม้คุณจะติดตามแล้ว</p></div>

      <Tabs defaultValue="numbers">
        <TabsList><TabsTrigger value="numbers">ชุดเลข</TabsTrigger><TabsTrigger value="dreams">ความฝัน</TabsTrigger><TabsTrigger value="tickets">สลากที่ซื้อ</TabsTrigger></TabsList>

        <TabsContent value="numbers" className="space-y-3">
          {predictions.map((prediction) => <Card key={prediction.id}><CardHeader className="p-4 pb-2"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-sm">{prediction.title ?? "ชุดเลขที่แชร์"}</CardTitle><p className="mt-1 text-[11px] text-muted-foreground">งวด {drawDate(prediction.lottery_draws?.draw_date)} · {sourceLabels[prediction.source_type] ?? prediction.source_type}</p></div><Badge variant="outline"><Eye className="size-3" /> สาธารณะ</Badge></div></CardHeader><CardContent className="flex flex-wrap gap-2 p-4 pt-2">{prediction.prediction_numbers.map((number) => <span key={number.id} className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 font-display text-lg font-bold tracking-wider text-primary">{number.number_value}</span>)}</CardContent></Card>)}
          {!predictions.length ? <Empty icon={Sparkles} title="ยังไม่มีชุดเลขที่แชร์" detail="ชุดเลขส่วนตัวของผู้ใช้นี้จะไม่แสดงที่นี่" /> : null}
        </TabsContent>

        <TabsContent value="dreams" className="space-y-3">
          {dreams.map((dream) => {
            const interpretation = dream.dream_interpretations[0];
            return <Card key={dream.id}><CardHeader className="p-4 pb-2"><div className="flex items-center justify-between gap-3"><CardTitle className="text-sm">ความฝันที่แชร์</CardTitle><Badge variant="secondary">ธาตุ{interpretation?.lucky_element ?? "—"}</Badge></div></CardHeader><CardContent className="p-4 pt-2"><p className="text-sm leading-6">“{dream.dream_text}”</p>{interpretation?.meaning ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{interpretation.meaning}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{(interpretation?.numbers ?? []).map((number, index) => number.value ? <Badge key={`${number.value}-${index}`} variant="outline" className="border-primary/20 text-primary">{number.label ? `${number.label}: ` : ""}{number.value}</Badge> : null)}</div></CardContent></Card>;
          })}
          {!dreams.length ? <Empty icon={LockKeyhole} title="ยังไม่มีความฝันสาธารณะ" detail="ความฝันทั้งหมดเป็นส่วนตัวโดยพื้นฐาน เจ้าของต้องเลือกแชร์เองเท่านั้น" /> : null}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3">
          {tickets.map((ticketItem) => <Card key={ticketItem.id}><CardContent className="flex items-center gap-3 p-4"><span className="flex size-11 items-center justify-center rounded-xl bg-secondary"><Ticket className="size-5 text-primary" /></span><div><strong className="font-display text-xl tracking-[.15em] text-primary">{ticketItem.ticket_number}</strong><p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><CalendarDays className="size-3" /> งวด {drawDate(ticketItem.lottery_draws?.draw_date)}</p></div></CardContent></Card>)}
          {!tickets.length ? <Empty icon={Ticket} title="ไม่มีสลากที่แชร์ให้คุณเห็น" detail={isFollowing ? "เจ้าของยังไม่ได้แชร์สลากกับผู้ติดตาม" : "ติดตามผู้ใช้นี้เพื่อดูสลากที่เขาเลือกแชร์เฉพาะผู้ติดตาม"} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ icon: Icon, title, detail }: { icon: typeof Ticket; title: string; detail: string }) {
  return <Card><CardContent className="flex flex-col items-center py-12 text-center"><span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary"><Icon className="size-6 text-muted-foreground" /></span><strong className="text-sm">{title}</strong><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{detail}</p></CardContent></Card>;
}
