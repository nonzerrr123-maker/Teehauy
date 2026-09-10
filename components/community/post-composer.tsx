"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Hash, ImagePlus, LoaderCircle, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Draw = { id: string; draw_date: string; status: string };
type ParsedNumber = { value: string; kind: "dream_two" | "dream_three" | "six_digit_ticket" };
export type ComposerProfile = { display_name: string; username: string | null; avatar_path: string | null };

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

export function PostComposer({ children, userId, profile: initialProfile }: { children: ReactNode; userId: string; profile?: ComposerProfile | null }) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ComposerProfile | null>(initialProfile ?? null);
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawId, setDrawId] = useState("");
  const [busy, setBusy] = useState(false);
  const [drawsLoading, setDrawsLoading] = useState(false);
  const [drawError, setDrawError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const numbers = useMemo(() => parseNumbers(body), [body]);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  useEffect(() => {
    if (!open || profile) return;
    let active = true;
    void createClient().from("profiles").select("display_name,username,avatar_path").eq("id", userId).single().then(({ data }) => {
      if (active && data) setProfile(data as ComposerProfile);
    });
    return () => { active = false; };
  }, [open, profile, userId]);

  useEffect(() => {
    if (!open || draws.length) return;
    let active = true;
    void createClient().from("lottery_draws").select("id, draw_date, status").eq("status", "scheduled").order("draw_date").limit(12).then(({ data, error }) => {
      if (!active) return;
      setDrawsLoading(false);
      if (error) { setDrawError(true); return; }
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
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_community_post", {
      p_body: normalized,
      p_draw_id: numbers.length ? drawId : null,
      p_numbers: numbers,
    });
    if (error) { setBusy(false); return setMessage(error.message.includes("Rate limit") ? "โพสต์ถี่เกินไป กรุณารอสักครู่" : "โพสต์ไม่สำเร็จ กรุณาลองอีกครั้ง"); }

    let createdMessage = "เผยแพร่โพสต์แล้ว";
    const postId = (data as { post_id?: string } | null)?.post_id;
    if (imageFile && postId) {
      const extension = imageFile.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const storagePath = `${userId}/${postId}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("post-media").upload(storagePath, imageFile, { contentType: imageFile.type });
      if (upload.error) createdMessage = "เผยแพร่โพสต์แล้ว แต่แนบรูปไม่สำเร็จ";
      else {
        const media = await supabase.from("post_media").insert({ post_id: postId, owner_id: userId, storage_path: storagePath, media_type: "image", position: 0 });
        if (media.error) {
          await supabase.storage.from("post-media").remove([storagePath]);
          createdMessage = "เผยแพร่โพสต์แล้ว แต่แนบรูปไม่สำเร็จ";
        }
      }
    }
    setBusy(false);
    setBody("");
    setImageFile(null);
    setImagePreview(null);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("teehauy:post-created", { detail: { message: createdMessage } }));
  };

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage("รองรับรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB");
      return;
    }
    setMessage(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const avatarUrl = profile?.avatar_path ? createClient().storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl : undefined;

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next && !draws.length) { setDrawsLoading(true); setDrawError(false); } if (!next) setMessage(null); }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">สร้างโพสต์</SheetTitle>
          <SheetDescription className="text-center">แบ่งปันความฝัน ชุดเลข หรือรูปภาพกับชุมชน</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-5 pb-4">
          <div className="flex items-center gap-3"><Avatar><AvatarImage src={avatarUrl} /><AvatarFallback>{(profile?.display_name ?? "T").slice(0, 1)}</AvatarFallback></Avatar><div className="min-w-0"><strong className="block truncate text-sm">{profile?.display_name ?? "สมาชิก Teehauy"}</strong><span className="text-[11px] text-muted-foreground">โพสต์แบบสาธารณะ</span></div></div>
          <div className="space-y-2">
            <Label htmlFor={`${fieldId}-body`} className="sr-only">เรื่องราวหรือชุดเลข</Label>
            <Textarea id={`${fieldId}-body`} rows={7} maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" placeholder="คุณอยากแบ่งปันอะไรกับชุมชน..." />
            <div className="flex justify-between text-[11px] text-muted-foreground"><span>รองรับเลข 2, 3 และ 6 หลัก</span><span>{body.length}/2,000</span></div>
          </div>

          {imagePreview ? <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted bg-cover bg-center" role="img" aria-label={`รูปที่เลือก ${imageFile?.name ?? ""}`} style={{ backgroundImage: `url(${imagePreview})` }}><Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 rounded-full" aria-label="นำรูปออก" onClick={removeImage}><X /></Button></div> : null}

          {numbers.length ? (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Hash className="size-4 text-primary" /> เลขที่พบ {numbers.length} ชุด</div>
              <div className="flex flex-wrap gap-2">{numbers.map((item) => <Badge key={`${item.kind}-${item.value}`} variant="outline" className="border-primary/25 bg-background text-primary">{item.value}</Badge>)}</div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-draw`}>บันทึกเข้ากับงวด</Label>
                <NativeSelect id={`${fieldId}-draw`} value={drawId} disabled={drawsLoading || drawError || !draws.length} onChange={(event) => setDrawId(event.target.value)}>
                  {drawsLoading ? <option value="">กำลังโหลดงวด...</option> : draws.length ? draws.map((draw) => <option key={draw.id} value={draw.id}>{drawLabel(draw.draw_date)}{draw.status === "scheduled" ? " · งวดถัดไป" : ""}</option>) : <option value="">ยังไม่มีงวดที่เปิดรับเลข</option>}
                </NativeSelect>
                {drawError ? <p className="text-xs text-destructive">โหลดงวดไม่สำเร็จ กรุณาปิดแล้วลองเปิดใหม่</p> : null}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-2xl border border-border p-3"><div><strong className="block text-sm">เพิ่มในโพสต์</strong><span className="text-[11px] text-muted-foreground">แนบรูปได้ 1 รูป</span></div><Label htmlFor={`${fieldId}-image`} className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-success/10 text-success transition-colors hover:bg-success/15"><ImagePlus className="size-5" /><span className="sr-only">เลือกรูปภาพ</span></Label><input id={`${fieldId}-image`} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => chooseImage(event.target.files?.[0])} /></div>

          {message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null}
          <Button type="button" variant="gold" size="lg" className="w-full" disabled={busy || !body.trim() || (numbers.length > 0 && !drawId)} onClick={() => void submit()}>
            {busy ? <><LoaderCircle className="animate-spin" /> กำลังเผยแพร่...</> : "เผยแพร่โพสต์"}
          </Button>
          <p className="text-center text-[10px] leading-4 text-muted-foreground">เพื่อความบันเทิงเท่านั้น โปรดไม่เผยแพร่ข้อมูลส่วนตัวหรือชักชวนเล่นพนัน</p>
          <span className="sr-only">ผู้โพสต์ {userId}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
