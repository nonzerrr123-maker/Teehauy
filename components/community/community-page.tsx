"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, Globe2, Heart, ImagePlus, MoreHorizontal, PencilLine, RefreshCw, Sparkles, Trash2, UserCheck, UserPlus } from "lucide-react";

import { PostComments, type PostComment } from "@/components/community/post-comments";
import { PostComposer, type ComposerProfile } from "@/components/community/post-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  related_prediction_id: string | null;
  profiles: { display_name: string; username: string | null; avatar_path: string | null } | null;
  post_reactions: { user_id: string; reaction: string }[];
  saved_posts: { user_id: string }[];
  post_comments: PostComment[];
  post_media: { id: number; storage_path: string; media_type: "image" | "video"; position: number }[];
  user_predictions: { prediction_numbers: { number_value: string; number_kind: string }[] } | null;
};

export function CommunityPage({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [feed, setFeed] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ComposerProfile | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [postResponse, followResponse, profileResponse] = await Promise.all([
      supabase.from("posts").select("id,author_id,body,created_at,related_prediction_id,profiles!posts_author_profile_fkey(display_name,username,avatar_path),post_reactions(user_id,reaction),saved_posts(user_id),post_comments(id,author_id,body,created_at,profiles!post_comments_author_profile_fkey(display_name,username,avatar_path)),post_media(id,storage_path,media_type,position),user_predictions!posts_related_prediction_id_fkey(prediction_numbers(number_value,number_kind))").eq("status", "published").order("created_at", { ascending: false }).order("created_at", { referencedTable: "post_comments", ascending: true }).order("position", { referencedTable: "post_media", ascending: true }).limit(50),
      supabase.from("user_follows").select("following_id").eq("follower_id", userId),
      supabase.from("profiles").select("display_name,username,avatar_path").eq("id", userId).single(),
    ]);
    if (postResponse.error || followResponse.error || profileResponse.error) setLoadError(true);
    else {
      setPosts((postResponse.data ?? []) as unknown as Post[]);
      setFollowingIds(new Set((followResponse.data ?? []).map((follow) => follow.following_id)));
      setViewerProfile(profileResponse.data as ComposerProfile);
      setLoadError(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const onCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setMessage(detail.message);
      void load();
    };
    window.addEventListener("teehauy:post-created", onCreated);
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => { window.clearTimeout(timer); window.removeEventListener("teehauy:post-created", onCreated); };
  }, [load]);

  const toggleLike = async (post: Post) => {
    const supabase = createClient();
    const liked = post.post_reactions.some((reaction) => reaction.user_id === userId);
    setPosts((current) => current.map((item) => item.id !== post.id ? item : { ...item, post_reactions: liked ? item.post_reactions.filter((reaction) => reaction.user_id !== userId) : [...item.post_reactions, { user_id: userId, reaction: "like" }] }));
    const result = liked ? await supabase.from("post_reactions").delete().eq("post_id", post.id).eq("user_id", userId) : await supabase.from("post_reactions").upsert({ post_id: post.id, user_id: userId, reaction: "like" });
    if (result.error) void load();
  };

  const toggleSave = async (post: Post) => {
    const supabase = createClient();
    const saved = post.saved_posts.some((item) => item.user_id === userId);
    setPosts((current) => current.map((item) => item.id !== post.id ? item : { ...item, saved_posts: saved ? [] : [{ user_id: userId }] }));
    const result = saved ? await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", userId) : await supabase.from("saved_posts").insert({ post_id: post.id, user_id: userId });
    if (result.error) void load();
  };

  const report = async (postId: string) => {
    if (!window.confirm("ต้องการรายงานโพสต์นี้ให้ทีมตรวจสอบหรือไม่")) return;
    const { error } = await createClient().from("reports").insert({ reporter_id: userId, target_type: "post", target_id: postId, reason: "misinformation" });
    setMessage(error ? "ส่งรายงานไม่สำเร็จ" : "ส่งรายงานให้ทีมตรวจสอบแล้ว");
  };

  const removePost = async (post: Post) => {
    if (!window.confirm("ลบโพสต์นี้หรือไม่ การดำเนินการนี้ย้อนกลับไม่ได้")) return;
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("author_id", userId);
    setMessage(error ? "ลบโพสต์ไม่สำเร็จ" : "ลบโพสต์แล้ว");
    if (!error) {
      setPosts((current) => current.filter((item) => item.id !== post.id));
      const storagePaths = post.post_media.map((media) => media.storage_path);
      if (storagePaths.length) await supabase.storage.from("post-media").remove(storagePaths);
    }
  };

  const toggleFollow = async (profileId: string) => {
    if (profileId === userId || followBusy) return;
    const wasFollowing = followingIds.has(profileId);
    setFollowBusy(profileId);
    setFollowingIds((current) => {
      const next = new Set(current);
      if (wasFollowing) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
    const supabase = createClient();
    const result = wasFollowing
      ? await supabase.from("user_follows").delete().eq("follower_id", userId).eq("following_id", profileId)
      : await supabase.from("user_follows").insert({ follower_id: userId, following_id: profileId });
    setFollowBusy(null);
    if (result.error) {
      setMessage(wasFollowing ? "เลิกติดตามไม่สำเร็จ" : "ติดตามไม่สำเร็จ");
      void load();
    }
  };

  if (loading) return <div className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-muted" /><div className="h-44 animate-pulse rounded-2xl bg-muted" /><div className="h-44 animate-pulse rounded-2xl bg-muted" /></div>;

  if (loadError) return <Card><CardContent className="flex flex-col items-center py-14 text-center"><span className="mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><RefreshCw className="size-6" /></span><strong className="text-sm">โหลดชุมชนไม่สำเร็จ</strong><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">การเชื่อมต่อข้อมูลโพสต์ขัดข้อง กรุณาลองโหลดใหม่อีกครั้ง</p><Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => { setLoading(true); void load(); }}><RefreshCw /> ลองใหม่</Button></CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/15"><CardContent className="p-4"><PostComposer userId={userId} profile={viewerProfile}><button type="button" className="flex w-full items-center gap-3 text-left"><Avatar className="size-11"><AvatarImage src={viewerProfile?.avatar_path ? createClient().storage.from("avatars").getPublicUrl(viewerProfile.avatar_path).data.publicUrl : undefined} /><AvatarFallback>{(viewerProfile?.display_name ?? "T").slice(0, 1)}</AvatarFallback></Avatar><span className="flex-1 rounded-full bg-secondary px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent">แชร์ความฝันหรือชุดเลขของคุณ...</span><PencilLine className="size-5 text-primary" /></button></PostComposer><Separator className="my-3" /><div className="grid grid-cols-3 text-center text-[11px] font-medium text-muted-foreground"><span className="flex items-center justify-center gap-1.5"><Sparkles className="size-4 text-primary" /> เล่าความฝัน</span><span className="flex items-center justify-center gap-1.5"><span className="font-display text-base text-primary">#</span> แชร์ชุดเลข</span><span className="flex items-center justify-center gap-1.5"><ImagePlus className="size-4 text-success" /> แนบรูป</span></div></CardContent></Card>
      <Tabs value={feed} onValueChange={(value) => setFeed(value as "all" | "following")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">โพสต์ทั้งหมด</TabsTrigger>
          <TabsTrigger value="following">คนที่ติดตาม</TabsTrigger>
        </TabsList>
      </Tabs>
      {message ? <p className="text-xs text-primary">{message}</p> : null}
      {posts.filter((post) => feed === "all" || followingIds.has(post.author_id)).map((post) => {
        const numbers = post.user_predictions?.prediction_numbers ?? [];
        const liked = post.post_reactions.some((reaction) => reaction.user_id === userId);
        const saved = post.saved_posts.some((item) => item.user_id === userId);
        const followed = followingIds.has(post.author_id);
        const avatarUrl = post.profiles?.avatar_path ? createClient().storage.from("avatars").getPublicUrl(post.profiles.avatar_path).data.publicUrl : undefined;
        return (
          <Card key={post.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4 pb-2">
              <Link href={`/users/${post.author_id}`} aria-label={`ดูโปรไฟล์ ${post.profiles?.display_name ?? "สมาชิก"}`}><Avatar><AvatarImage src={avatarUrl} /><AvatarFallback>{(post.profiles?.display_name ?? "T").slice(0, 1)}</AvatarFallback></Avatar></Link>
              <div className="min-w-0 flex-1"><Link href={`/users/${post.author_id}`} className="block truncate text-sm font-semibold hover:text-primary">{post.profiles?.display_name ?? "สมาชิก Teehauy"}</Link><span className="flex items-center gap-1 text-[11px] text-muted-foreground">{post.profiles?.username ? `@${post.profiles.username} · ` : ""}{new Date(post.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} <Globe2 className="size-3" aria-label="สาธารณะ" /></span></div>
              {post.author_id !== userId ? <Button type="button" variant={followed ? "secondary" : "outline"} size="sm" disabled={followBusy === post.author_id} onClick={() => void toggleFollow(post.author_id)}>{followed ? <UserCheck /> : <UserPlus />}<span className="hidden sm:inline">{followed ? "ติดตามแล้ว" : "ติดตาม"}</span></Button> : null}
              {post.author_id === userId ? <Button type="button" variant="ghost" size="icon" aria-label="ลบโพสต์" onClick={() => void removePost(post)}><Trash2 /></Button> : <Button type="button" variant="ghost" size="icon" aria-label="รายงานโพสต์" onClick={() => void report(post.id)}><MoreHorizontal /></Button>}
            </CardHeader>
            <CardContent className="p-4 pt-2"><p className="whitespace-pre-wrap text-[15px] leading-7">{post.body}</p>{numbers.length ? <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ชุดเลขจากโพสต์</p><div className="flex flex-wrap gap-2">{numbers.map((number) => <Badge key={`${number.number_kind}-${number.number_value}`} variant="outline" className="border-primary/25 bg-background px-3 py-1.5 font-display text-sm text-primary">{number.number_value}<span className="ml-1 font-sans text-[9px] font-normal text-muted-foreground">{numberKindLabel[number.number_kind] ?? "เลข"}</span></Badge>)}</div></div> : null}</CardContent>
            {post.post_media.map((media) => <PostMedia key={media.id} media={media} />)}
            <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground"><span>{post.post_reactions.length ? `${post.post_reactions.length} คนถูกใจ` : "เป็นคนแรกที่ถูกใจ"}</span><span>{post.post_comments.length ? `${post.post_comments.length} ความคิดเห็น` : "ยังไม่มีความคิดเห็น"}</span></div>
            <CardFooter className="flex-wrap border-t border-border px-2 py-1"><Button type="button" variant="ghost" size="sm" className={`flex-1 ${liked ? "text-primary" : ""}`} onClick={() => void toggleLike(post)}><Heart fill={liked ? "currentColor" : "none"} /> {liked ? "ถูกใจแล้ว" : "ถูกใจ"}</Button><PostComments postId={post.id} userId={userId} comments={post.post_comments ?? []} onChanged={load} /><Button type="button" variant="ghost" size="sm" className={`flex-1 ${saved ? "text-primary" : ""}`} onClick={() => void toggleSave(post)}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "บันทึกแล้ว" : "บันทึก"}</Button></CardFooter>
          </Card>
        );
      })}
      {!posts.length ? <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีโพสต์ เป็นคนแรกที่แชร์ฝันได้เลย</CardContent></Card> : null}
      {posts.length && feed === "following" && !posts.some((post) => followingIds.has(post.author_id)) ? <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีโพสต์จากคนที่ติดตาม ลองเลือก “โพสต์ทั้งหมด” เพื่อค้นหาคนที่สนใจ</CardContent></Card> : null}
    </div>
  );
}

const numberKindLabel: Record<string, string> = { dream_two: "2 ตัว", derived_top_two: "2 ตัวบน", last_two: "2 ตัวล่าง", dream_three: "3 ตัว", front_three: "3 ตัวหน้า", last_three: "3 ตัวท้าย", six_digit_ticket: "6 หลัก" };

function PostMedia({ media }: { media: Post["post_media"][number] }) {
  const url = createClient().storage.from("post-media").getPublicUrl(media.storage_path).data.publicUrl;
  if (media.media_type === "video") return <video controls preload="metadata" className="max-h-[34rem] w-full bg-black" src={url}>เบราว์เซอร์นี้ไม่รองรับวิดีโอ</video>;
  return <div className="relative aspect-[4/3] w-full bg-muted"><Image src={url} alt="รูปภาพประกอบโพสต์" fill unoptimized sizes="(max-width: 768px) 100vw, 672px" className="object-cover" /></div>;
}
