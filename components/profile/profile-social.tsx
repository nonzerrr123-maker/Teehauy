"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Globe2, LoaderCircle, RefreshCw, UserCheck, UserPlus, UsersRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

export type ConnectionKind = "followers" | "following";

export type ProfilePost = {
  id: string;
  body: string;
  created_at: string;
  post_comments: { id: string }[];
  post_media: { id: number; storage_path: string; media_type: "image" | "video"; position: number }[];
  post_reactions: { user_id: string }[];
  user_predictions: { prediction_numbers: { number_value: string; number_kind: string }[] } | null;
};

export const profilePostsSelect =
  "id,body,created_at,post_comments(id),post_media(id,storage_path,media_type,position),post_reactions(user_id),user_predictions!posts_related_prediction_id_fkey(prediction_numbers(number_value,number_kind))";

const numberKindLabel: Record<string, string> = {
  dream_two: "2 ตัว",
  derived_top_two: "2 ตัวบน",
  last_two: "2 ตัวล่าง",
  dream_three: "3 ตัว",
  front_three: "3 ตัวหน้า",
  last_three: "3 ตัวท้าย",
  six_digit_ticket: "6 หลัก",
};

type ConnectionProfile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  bio: string | null;
};

export function ProfileSocialStats({
  posts,
  followers,
  following,
  onPostsClick,
  onFollowersClick,
  onFollowingClick,
}: {
  posts: number;
  followers: number;
  following: number;
  onPostsClick: () => void;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-3 border-t border-border pt-4">
      <SocialStat value={posts} label="โพสต์" onClick={onPostsClick} />
      <SocialStat value={followers} label="ผู้ติดตาม" onClick={onFollowersClick} />
      <SocialStat value={following} label="กำลังติดตาม" onClick={onFollowingClick} />
    </div>
  );
}

function SocialStat({ value, label, onClick }: { value: number; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="rounded-xl px-1 py-2 text-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      onClick={onClick}
      aria-label={`${label} ${value}`}
    >
      <strong className="block font-display text-xl text-foreground">{value}</strong>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </button>
  );
}

export function ProfileConnectionsSheet({
  kind,
  profileUserId,
  viewerId,
  profileDisplayName,
  onOpenChange,
  onChanged,
}: {
  kind: ConnectionKind | null;
  profileUserId: string;
  viewerId: string;
  profileDisplayName: string;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void | Promise<void>;
}) {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [viewerFollowing, setViewerFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!kind) return;
    setLoading(true);
    setLoadError(false);
    setMessage(null);

    const supabase = createClient();
    const idColumn = kind === "followers" ? "follower_id" : "following_id";
    const filterColumn = kind === "followers" ? "following_id" : "follower_id";
    const connectionResult = await supabase
      .from("user_follows")
      .select(`${idColumn},created_at`)
      .eq(filterColumn, profileUserId)
      .order("created_at", { ascending: false });

    if (connectionResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const rows = (connectionResult.data ?? []) as unknown as Array<{
      follower_id?: string;
      following_id?: string;
    }>;
    const ids = rows
      .map((row) => (kind === "followers" ? row.follower_id : row.following_id))
      .filter((id): id is string => Boolean(id));

    if (!ids.length) {
      setProfiles([]);
      setViewerFollowing(new Set());
      setLoading(false);
      return;
    }

    const [profilesResult, viewerFollowingResult] = await Promise.all([
      supabase.from("profiles").select("id,display_name,username,avatar_path,bio").in("id", ids),
      supabase.from("user_follows").select("following_id").eq("follower_id", viewerId).in("following_id", ids),
    ]);

    if (profilesResult.error || viewerFollowingResult.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const profileById = new Map(
      ((profilesResult.data ?? []) as ConnectionProfile[]).map((profile) => [profile.id, profile]),
    );
    setProfiles(ids.map((id) => profileById.get(id)).filter((profile): profile is ConnectionProfile => Boolean(profile)));
    setViewerFollowing(new Set((viewerFollowingResult.data ?? []).map((row) => row.following_id)));
    setLoading(false);
  }, [kind, profileUserId, viewerId]);

  useEffect(() => {
    if (!kind) return;
    const timer = window.setTimeout(() => void loadConnections(), 0);
    return () => window.clearTimeout(timer);
  }, [kind, loadConnections]);

  const toggleFollow = async (targetId: string) => {
    if (targetId === viewerId || busyId) return;
    const isFollowing = viewerFollowing.has(targetId);
    setBusyId(targetId);
    setMessage(null);

    const supabase = createClient();
    const result = isFollowing
      ? await supabase.from("user_follows").delete().eq("follower_id", viewerId).eq("following_id", targetId)
      : await supabase.from("user_follows").insert({ follower_id: viewerId, following_id: targetId });

    setBusyId(null);
    if (result.error) {
      setMessage(isFollowing ? "เลิกติดตามไม่สำเร็จ" : "ติดตามไม่สำเร็จ");
      return;
    }

    setViewerFollowing((current) => {
      const next = new Set(current);
      if (isFollowing) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
    await onChanged?.();
    await loadConnections();
  };

  const title = kind === "followers" ? "ผู้ติดตาม" : "กำลังติดตาม";
  const emptyText = kind === "followers" ? "ยังไม่มีผู้ติดตาม" : "ยังไม่ได้ติดตามใคร";

  return (
    <Sheet open={Boolean(kind)} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-h-[82dvh] flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>รายชื่อของ {profileDisplayName}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" /> กำลังโหลดรายชื่อ
            </div>
          ) : null}

          {!loading && loadError ? (
            <div className="flex flex-col items-center py-12 text-center">
              <RefreshCw className="mb-3 size-6 text-destructive" />
              <strong className="text-sm">โหลดรายชื่อไม่สำเร็จ</strong>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void loadConnections()}>
                <RefreshCw /> ลองใหม่
              </Button>
            </div>
          ) : null}

          {!loading && !loadError && !profiles.length ? (
            <div className="flex flex-col items-center py-14 text-center text-muted-foreground">
              <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary">
                <UsersRound className="size-6" />
              </span>
              <strong className="text-sm text-foreground">{emptyText}</strong>
            </div>
          ) : null}

          {!loading && !loadError ? (
            <div className="space-y-1">
              {profiles.map((profile) => {
                const avatarUrl = profile.avatar_path
                  ? createClient().storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
                  : undefined;
                const isViewer = profile.id === viewerId;
                const isFollowing = viewerFollowing.has(profile.id);
                const followLabel =
                  kind === "followers" && profileUserId === viewerId ? "ติดตามกลับ" : "ติดตาม";

                return (
                  <div key={profile.id} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-accent/60">
                    <Link href={`/users/${profile.id}`} onClick={() => onOpenChange(false)} aria-label={`เปิดโปรไฟล์ ${profile.display_name}`}>
                      <Avatar className="size-12">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback>{profile.display_name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <Link href={`/users/${profile.id}`} onClick={() => onOpenChange(false)} className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{profile.display_name}</strong>
                      <span className="block truncate text-xs text-muted-foreground">
                        {profile.username ? `@${profile.username}` : "สมาชิก Teehauy"}
                      </span>
                    </Link>
                    {isViewer ? (
                      <Badge variant="secondary">คุณ</Badge>
                    ) : (
                      <Button
                        type="button"
                        variant={isFollowing ? "secondary" : "outline"}
                        size="sm"
                        disabled={busyId === profile.id}
                        onClick={() => void toggleFollow(profile.id)}
                      >
                        {busyId === profile.id ? (
                          <LoaderCircle className="animate-spin" />
                        ) : isFollowing ? (
                          <UserCheck />
                        ) : (
                          <UserPlus />
                        )}
                        {isFollowing ? "ติดตามแล้ว" : followLabel}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
          {message ? <p className="px-2 pt-2 text-xs text-destructive">{message}</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ProfilePosts({ posts, ownerLabel }: { posts: ProfilePost[]; ownerLabel: string }) {
  if (!posts.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-14 text-center">
          <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary">
            <Globe2 className="size-6 text-muted-foreground" />
          </span>
          <strong className="text-sm">ยังไม่มีโพสต์</strong>
          <p className="mt-1 text-xs text-muted-foreground">โพสต์สาธารณะของ{ownerLabel}จะแสดงที่นี่</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const numbers = post.user_predictions?.prediction_numbers ?? [];
        return (
          <Card key={post.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <span className="text-xs text-muted-foreground">
                {new Date(post.created_at).toLocaleString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Globe2 className="size-3" /> สาธารณะ
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="whitespace-pre-wrap text-[15px] leading-7">{post.body}</p>
              {numbers.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {numbers.map((number) => (
                    <Badge
                      key={`${number.number_kind}-${number.number_value}`}
                      variant="outline"
                      className="border-primary/25 bg-primary/5 px-3 py-1.5 font-display text-sm text-primary"
                    >
                      {number.number_value}
                      <span className="ml-1 font-sans text-[9px] font-normal text-muted-foreground">
                        {numberKindLabel[number.number_kind] ?? "เลข"}
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
            {post.post_media.length ? (
              <div className={post.post_media.length > 1 ? "grid grid-cols-2 gap-px bg-border" : ""}>
                {post.post_media.map((media) => (
                  <ProfilePostMedia key={media.id} media={media} compact={post.post_media.length > 1} />
                ))}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-4 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
              <span>{post.post_reactions.length} ถูกใจ</span>
              <span>{post.post_comments.length} ความคิดเห็น</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ProfilePostMedia({
  media,
  compact,
}: {
  media: ProfilePost["post_media"][number];
  compact: boolean;
}) {
  const url = createClient().storage.from("post-media").getPublicUrl(media.storage_path).data.publicUrl;
  const className = compact ? "aspect-square w-full object-cover" : "max-h-[34rem] w-full object-cover";

  if (media.media_type === "video") {
    return <video controls preload="metadata" className={`${className} bg-black`} src={url}>เบราว์เซอร์นี้ไม่รองรับวิดีโอ</video>;
  }

  return (
    <div className={`relative w-full bg-muted ${compact ? "aspect-square" : "aspect-[4/3]"}`}>
      <Image
        src={url}
        alt="รูปภาพประกอบโพสต์"
        fill
        unoptimized
        sizes={compact ? "(max-width: 768px) 50vw, 336px" : "(max-width: 768px) 100vw, 672px"}
        className="object-cover"
      />
    </div>
  );
}
