"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, Heart, MoreHorizontal, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
  user_predictions: { prediction_numbers: { number_value: string; number_kind: string }[] } | null;
};

export function CommunityPage({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("posts").select("id,author_id,body,created_at,related_prediction_id,profiles!posts_author_id_fkey(display_name,username,avatar_path),post_reactions(user_id,reaction),saved_posts(user_id),user_predictions!posts_related_prediction_id_fkey(prediction_numbers(number_value,number_kind))").eq("status", "published").order("created_at", { ascending: false }).limit(50);
    if (error) setMessage("โหลดชุมชนไม่สำเร็จ");
    else setPosts((data ?? []) as unknown as Post[]);
    setLoading(false);
  }, []);

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

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลดชุมชน...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground"><Sparkles className="mr-2 inline size-4 text-primary" />กดปุ่ม <strong className="text-primary">+</strong> ด้านล่างเพื่อแชร์ฝัน ระบบจะจับเลขและเก็บไว้ตรวจผลให้อัตโนมัติ</div>
      {message ? <p className="text-xs text-primary">{message}</p> : null}
      {posts.map((post) => {
        const numbers = post.user_predictions?.prediction_numbers ?? [];
        const liked = post.post_reactions.some((reaction) => reaction.user_id === userId);
        const saved = post.saved_posts.some((item) => item.user_id === userId);
        const avatarUrl = post.profiles?.avatar_path ? createClient().storage.from("avatars").getPublicUrl(post.profiles.avatar_path).data.publicUrl : undefined;
        return (
          <Card key={post.id}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4 pb-2">
              <Avatar><AvatarImage src={avatarUrl} /><AvatarFallback>{(post.profiles?.display_name ?? "T").slice(0, 1)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{post.profiles?.display_name ?? "สมาชิก Teehauy"}</strong><span className="text-[11px] text-muted-foreground">{new Date(post.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
              <Button type="button" variant="ghost" size="icon" aria-label="รายงานโพสต์" onClick={() => void report(post.id)}><MoreHorizontal /></Button>
            </CardHeader>
            <CardContent className="p-4 pt-2"><p className="whitespace-pre-wrap text-sm leading-6">{post.body}</p>{numbers.length ? <div className="mt-4 flex flex-wrap gap-2">{numbers.map((number) => <Badge key={`${number.number_kind}-${number.number_value}`} variant="outline" className="border-primary/20 bg-primary/5 px-3 py-1 text-primary">{number.number_value}</Badge>)}</div> : null}</CardContent>
            <CardFooter className="border-t border-border px-3 py-2"><Button type="button" variant="ghost" size="sm" className={liked ? "text-primary" : undefined} onClick={() => void toggleLike(post)}><Heart fill={liked ? "currentColor" : "none"} /> {post.post_reactions.length}</Button><Button type="button" variant="ghost" size="sm" className={`ml-auto ${saved ? "text-primary" : ""}`} onClick={() => void toggleSave(post)}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "บันทึกแล้ว" : "บันทึก"}</Button></CardFooter>
          </Card>
        );
      })}
      {!posts.length ? <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">ยังไม่มีโพสต์ เป็นคนแรกที่แชร์ฝันได้เลย</CardContent></Card> : null}
    </div>
  );
}
