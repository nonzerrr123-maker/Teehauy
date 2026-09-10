"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, Heart, MoreHorizontal, RefreshCw, Sparkles, UserCheck, UserPlus } from "lucide-react";

import { PostComments, type PostComment } from "@/components/community/post-comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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

  const load = useCallback(async () => {
    const supabase = createClient();
    const [postResponse, followResponse] = await Promise.all([
      supabase.from("posts").select("id,author_id,body,created_at,related_prediction_id,profiles!posts_author_profile_fkey(display_name,username,avatar_path),post_reactions(user_id,reaction),saved_posts(user_id),post_comments(id,author_id,body,created_at,profiles!post_comments_author_profile_fkey(display_name,username,avatar_path)),user_predictions!posts_related_prediction_id_fkey(prediction_numbers(number_value,number_kind))").eq("status", "published").order("created_at", { ascending: false }).order("created_at", { referencedTable: "post_comments", ascending: true }).limit(50),
      supabase.from("user_follows").select("following_id").eq("follower_id", userId),
    ]);
    if (postResponse.error || followResponse.error) setLoadError(true);
    else {
      setPosts((postResponse.data ?? []) as unknown as Post[]);
      setFollowingIds(new Set((followResponse.data ?? []).map((follow) => follow.following_id)));
      setLoadError(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const onCreated = () => void load();
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
    const { error } = await createClient().from("reports").insert({ reporter_id: userId, target_type: "post", target_id: postId, reason: "misinformation" });
    setMessage(error ? "ส่งรายงานไม่สำเร็จ" : "ส่งรายงานให้ทีมตรวจสอบแล้ว");
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
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground"><Sparkles className="mr-2 inline size-4 text-primary" />กดปุ่ม <strong className="text-primary">+</strong> ด้านล่างเพื่อแชร์ฝัน ระบบจะจับเลขและเก็บไว้ตรวจผลให้อัตโนมัติ</div>
      <Tabs value={feed} onValueChange={(value) => setFeed(value as "all" | "following")}>
        <TabsList>
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
          <Card key={post.id}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4 pb-2">
              <Link href={`/users/${post.author_id}`} aria-label={`ดูโปรไฟล์ ${post.profiles?.display_name ?? "สมาชิก"}`}><Avatar><AvatarImage src={avatarUrl} /><AvatarFallback>{(post.profiles?.display_name ?? "T").slice(0, 1)}</AvatarFallback></Avatar></Link>
              <div className="min-w-0 flex-1"><Link href={`/users/${post.author_id}`} className="block truncate text-sm font-semibold hover:text-primary">{post.profiles?.display_name ?? "สมาชิก Teehauy"}</Link><span className="text-[11px] text-muted-foreground">{new Date(post.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
              {post.author_id !== userId ? <Button type="button" variant={followed ? "secondary" : "outline"} size="sm" disabled={followBusy === post.author_id} onClick={() => void toggleFollow(post.author_id)}>{followed ? <UserCheck /> : <UserPlus />}<span className="hidden sm:inline">{followed ? "ติดตามแล้ว" : "ติดตาม"}</span></Button> : null}
              <Button type="button" variant="ghost" size="icon" aria-label="รายงานโพสต์" onClick={() => void report(post.id)}><MoreHorizontal /></Button>
            </CardHeader>
            <CardContent className="p-4 pt-2"><p className="whitespace-pre-wrap text-sm leading-6">{post.body}</p>{numbers.length ? <div className="mt-4 flex flex-wrap gap-2">{numbers.map((number) => <Badge key={`${number.number_kind}-${number.number_value}`} variant="outline" className="border-primary/20 bg-primary/5 px-3 py-1 text-primary">{number.number_value}</Badge>)}</div> : null}</CardContent>
            <CardFooter className="flex-wrap border-t border-border px-3 py-2"><Button type="button" variant="ghost" size="sm" className={liked ? "text-primary" : undefined} onClick={() => void toggleLike(post)}><Heart fill={liked ? "currentColor" : "none"} /> {post.post_reactions.length}</Button><Button type="button" variant="ghost" size="sm" className={`ml-auto ${saved ? "text-primary" : ""}`} onClick={() => void toggleSave(post)}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "บันทึกแล้ว" : "บันทึก"}</Button><PostComments postId={post.id} userId={userId} comments={post.post_comments ?? []} onChanged={load} /></CardFooter>
          </Card>
        );
      })}
      {!posts.length ? <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีโพสต์ เป็นคนแรกที่แชร์ฝันได้เลย</CardContent></Card> : null}
      {posts.length && feed === "following" && !posts.some((post) => followingIds.has(post.author_id)) ? <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีโพสต์จากคนที่ติดตาม ลองเลือก “โพสต์ทั้งหมด” เพื่อค้นหาคนที่สนใจ</CardContent></Card> : null}
    </div>
  );
}
