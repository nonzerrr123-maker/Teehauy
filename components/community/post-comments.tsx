"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircle, Send, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export type PostComment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: {
    display_name: string;
    username: string | null;
    avatar_path: string | null;
  } | null;
};

export function PostComments({
  postId,
  userId,
  comments,
  onChanged,
}: {
  postId: string;
  userId: string;
  comments: PostComment[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = body.trim();
    if (!normalized) return;

    setBusy(true);
    setMessage(null);
    const { error } = await createClient().rpc("create_post_comment", {
      p_post_id: postId,
      p_body: normalized,
    });
    setBusy(false);

    if (error) {
      setMessage(error.message.includes("Rate limit") ? "คอมเมนต์ถี่เกินไป กรุณารอสักครู่" : "ส่งคอมเมนต์ไม่สำเร็จ");
      return;
    }

    setBody("");
    await onChanged();
  };

  const remove = async (commentId: string) => {
    setMessage(null);
    const { error } = await createClient()
      .from("post_comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", userId);
    if (error) {
      setMessage("ลบคอมเมนต์ไม่สำเร็จ");
      return;
    }
    await onChanged();
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="flex-1"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MessageCircle /> ความคิดเห็น
      </Button>

      {open ? (
        <div className="mt-2 basis-full border-t border-border px-1 pt-3">
          <div className="space-y-3">
            {comments.map((comment) => {
              const avatarUrl = comment.profiles?.avatar_path
                ? createClient().storage.from("avatars").getPublicUrl(comment.profiles.avatar_path).data.publicUrl
                : undefined;

              return (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <Link href={`/users/${comment.author_id}`} aria-label={`ดูโปรไฟล์ ${comment.profiles?.display_name ?? "สมาชิก"}`}>
                    <Avatar className="size-8">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>{(comment.profiles?.display_name ?? "T").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1 rounded-2xl bg-muted px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/users/${comment.author_id}`} className="truncate text-xs font-semibold hover:text-primary">
                        {comment.profiles?.display_name ?? "สมาชิก Teehauy"}
                      </Link>
                      <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">{comment.body}</p>
                  </div>
                  {comment.author_id === userId ? (
                    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="ลบคอมเมนต์" onClick={() => void remove(comment.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
            {!comments.length ? <p className="py-2 text-center text-xs text-muted-foreground">เริ่มบทสนทนาใต้โพสต์นี้ได้เลย</p> : null}
          </div>

          <form onSubmit={submit} className="mt-3 flex gap-2">
            <Input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              placeholder="เขียนคอมเมนต์..."
              aria-label="เขียนคอมเมนต์"
            />
            <Button type="submit" size="icon" disabled={busy || !body.trim()} aria-label="ส่งคอมเมนต์">
              {busy ? <LoaderCircle className="animate-spin" /> : <Send />}
            </Button>
          </form>
          {message ? <p className="mt-2 text-xs text-destructive">{message}</p> : null}
        </div>
      ) : null}
    </>
  );
}
