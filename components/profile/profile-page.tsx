"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, Edit3, LoaderCircle, RefreshCw, Settings, ShieldCheck } from "lucide-react";

import {
  type ConnectionKind,
  type ProfilePost,
  ProfileConnectionsSheet,
  ProfilePosts,
  ProfileSocialStats,
  profilePostsSelect,
} from "@/components/profile/profile-social";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  account_kind: "guest" | "google";
  bio: string | null;
  created_at: string;
};

type Counts = {
  dreams: number;
  predictions: number;
  posts: number;
  followers: number;
  following: number;
};

const initialCounts: Counts = { dreams: 0, predictions: 0, posts: 0, followers: 0, following: 0 };

export function AccountPage({ userId }: { userId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const postsSection = useRef<HTMLElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [connectionKind, setConnectionKind] = useState<ConnectionKind | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [profileResult, dreams, predictions, postsResult, followersResult, followingResult] = await Promise.all([
      supabase.from("profiles").select("display_name,username,avatar_path,account_kind,bio,created_at").eq("id", userId).single(),
      supabase.from("dreams").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("user_predictions").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("posts")
        .select(profilePostsSelect, { count: "exact" })
        .eq("author_id", userId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .order("position", { referencedTable: "post_media", ascending: true })
        .limit(50),
      supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("user_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
    ]);

    if (
      profileResult.error ||
      dreams.error ||
      predictions.error ||
      postsResult.error ||
      followersResult.error ||
      followingResult.error
    ) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    setLoadError(false);
    if (profileResult.data) {
      const next = profileResult.data as Profile;
      setProfile(next);
      setName(next.display_name);
      setUsername(next.username ?? "");
      setBio(next.bio ?? "");
    }
    const nextPosts = (postsResult.data ?? []) as unknown as ProfilePost[];
    setPosts(nextPosts);
    setCounts({
      dreams: dreams.count ?? 0,
      predictions: predictions.count ?? 0,
      posts: postsResult.count ?? nextPosts.length,
      followers: followersResult.count ?? 0,
      following: followingResult.count ?? 0,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const avatarUrl = profile?.avatar_path
    ? createClient().storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
    : undefined;

  const saveProfile = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    if (!name.trim()) return setMessage("กรอกชื่อที่แสดง");
    if (normalizedUsername && !/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      return setMessage("Username ใช้ a-z, 0-9, _ จำนวน 3-30 ตัว");
    }

    setBusy(true);
    setMessage(null);
    const { error } = await createClient()
      .from("profiles")
      .update({ display_name: name.trim(), username: normalizedUsername || null, bio: bio.trim() || null })
      .eq("id", userId);
    setBusy(false);

    if (error) return setMessage(error.code === "23505" ? "Username นี้ถูกใช้แล้ว" : error.message);
    setEditing(false);
    await load();
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      return setMessage("รองรับ JPG, PNG, WebP ไม่เกิน 5 MB");
    }

    setBusy(true);
    setMessage(null);
    const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "webp";
    const path = `${userId}/avatar.${extension}`;
    const supabase = createClient();
    const upload = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    const profileUpdate = upload.error
      ? null
      : await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
    setBusy(false);

    if (upload.error) return setMessage(upload.error.message);
    if (profileUpdate?.error) return setMessage(profileUpdate.error.message);
    await load();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-14 text-center">
          <strong className="text-sm">โหลดโปรไฟล์ไม่สำเร็จ</strong>
          <p className="mt-1 text-xs text-muted-foreground">กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            <RefreshCw /> ลองใหม่
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-primary/15">
        <div className="h-24 bg-[radial-gradient(circle_at_25%_0%,color-mix(in_srgb,var(--primary)_22%,transparent),transparent_55%),linear-gradient(135deg,var(--accent),var(--card))]" />
        <CardContent className="relative px-5 pb-5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="group relative -mt-12 block rounded-full"
            aria-label="เปลี่ยนรูปโปรไฟล์"
          >
            <Avatar className="size-24 border-4 border-card">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">{profile.display_name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
              <Camera className="size-4" />
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void uploadAvatar(event.target.files?.[0])}
          />

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-bold">{profile.display_name}</h2>
                <Badge variant={profile.account_kind === "google" ? "default" : "secondary"}>
                  {profile.account_kind === "google" ? "Google" : "Guest"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {profile.username ? `@${profile.username}` : `สมาชิก ${userId.slice(0, 8)}`}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit3 /> แก้ไข
            </Button>
          </div>
          {profile.bio ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{profile.bio}</p> : null}

          <ProfileSocialStats
            posts={counts.posts}
            followers={counts.followers}
            following={counts.following}
            onPostsClick={() => postsSection.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            onFollowersClick={() => setConnectionKind("followers")}
            onFollowingClick={() => setConnectionKind("following")}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <PrivateStat value={counts.dreams} label="ความฝันของฉัน" />
        <PrivateStat value={counts.predictions} label="ชุดเลขของฉัน" />
      </div>

      {profile.account_kind === "guest" ? (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="flex gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <strong className="text-sm">บัญชี Guest นี้จำอยู่ในเบราว์เซอร์ปัจจุบัน</strong>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                เชื่อม Google ในหน้าตั้งค่าเพื่อเก็บข้อมูลเดิมและใช้งานต่อจากอุปกรณ์อื่นได้
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section ref={postsSection} aria-labelledby="profile-posts-title" className="scroll-mt-20 space-y-3">
        <div className="flex items-end justify-between px-1">
          <div>
            <h3 id="profile-posts-title" className="font-semibold">โพสต์ของคุณ</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">โพสต์ที่เผยแพร่ในชุมชน</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/community">ไปชุมชน</Link>
          </Button>
        </div>
        <ProfilePosts posts={posts} ownerLabel="คุณ" />
      </section>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">บัญชีและแอป</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <Link href="/settings" className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-accent">
            <Settings className="size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm">การตั้งค่า</strong>
              <span className="text-xs text-muted-foreground">บัญชี การแจ้งเตือน และการใช้งานอย่างรับผิดชอบ</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
      {message ? <p className="text-xs text-primary">{message}</p> : null}

      <ProfileConnectionsSheet
        kind={connectionKind}
        profileUserId={userId}
        viewerId={userId}
        profileDisplayName={profile.display_name}
        onOpenChange={(open) => {
          if (!open) setConnectionKind(null);
        }}
        onChanged={load}
      />

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>แก้ไขโปรไฟล์</SheetTitle>
            <SheetDescription>ข้อมูลนี้แสดงกับโพสต์สาธารณะของคุณ</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-5">
            <div className="space-y-2">
              <Label htmlFor="display-name">ชื่อที่แสดง</Label>
              <Input id="display-name" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                maxLength={30}
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                placeholder="lucky_dreamer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">แนะนำตัว</Label>
              <Textarea id="bio" maxLength={280} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
            </div>
            {message ? <p className="text-xs text-destructive">{message}</p> : null}
            <Button type="button" variant="gold" size="lg" className="w-full" disabled={busy} onClick={() => void saveProfile()}>
              {busy ? <LoaderCircle className="animate-spin" /> : null} บันทึกโปรไฟล์
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PrivateStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-2 py-3 text-center">
      <strong className="block font-display text-xl text-primary">{value}</strong>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
