"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Heart, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dictionaryEntries } from "@/lib/dream-catalog";
import type { DreamResult } from "@/lib/dream-engine";

type HistoryResponse = { ok: true; history: DreamResult[]; favorites: DreamResult[] } | { ok: false };

export function DreamLibraryPage() {
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<DreamResult[]>([]);
  const [favorites, setFavorites] = useState<DreamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/dream/history", { cache: "no-store" }).then((response) => response.json() as Promise<HistoryResponse>).then((payload) => { if (active && payload.ok) { setHistory(payload.history); setFavorites(payload.favorites); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => dictionaryEntries.filter((item) => `${item.name} ${item.meaning} ${item.numbers}`.includes(search.trim())).slice(0, 60), [search]);

  return (
    <Tabs defaultValue="dictionary">
      <TabsList><TabsTrigger value="dictionary">พจนานุกรมฝัน</TabsTrigger><TabsTrigger value="history">ประวัติ ({history.length})</TabsTrigger><TabsTrigger value="favorites">บันทึกไว้ ({favorites.length})</TabsTrigger></TabsList>
      <TabsContent value="dictionary" className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหา เช่น งู น้ำ หรือ 74" className="pl-9" /></div>
        {filtered.map((item) => <Card key={item.name}><CardContent className="flex items-start gap-3 p-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">{item.emoji}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><strong>{item.name}</strong><Badge variant="secondary">โชค{item.luck}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.meaning}</p><p className="mt-2 font-display text-lg font-bold tracking-wider text-primary">{item.numbers}</p></div></CardContent></Card>)}
        {!filtered.length ? <Empty icon={Search} text="ไม่พบคำในคลังฝัน" /> : null}
      </TabsContent>
      <TabsContent value="history"><ResultList items={history} loading={loading} empty="ยังไม่มีประวัติความฝัน" /></TabsContent>
      <TabsContent value="favorites"><ResultList items={favorites} loading={loading} empty="ยังไม่มีรายการที่บันทึกไว้" /></TabsContent>
    </Tabs>
  );
}

function ResultList({ items, loading, empty }: { items: DreamResult[]; loading: boolean; empty: string }) {
  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด...</p>;
  if (!items.length) return <Empty icon={BookOpen} text={empty} />;
  return <div className="space-y-3">{items.map((result, index) => <Card key={result.id ?? `${result.date}-${index}`}><CardContent className="p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm leading-6">“{result.dreamText}”</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(result.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</p></div><Heart className="size-4 shrink-0 text-primary" fill="currentColor" /></div><div className="mt-3 flex flex-wrap gap-2">{result.numbers.slice(0, 4).map((number) => <Badge key={`${number.type}-${number.value}`} variant="outline" className="border-primary/20 text-primary">{number.label} {number.value}</Badge>)}</div></CardContent></Card>)}</div>;
}

function Empty({ icon: Icon, text }: { icon: typeof Search; text: string }) {
  return <div className="flex flex-col items-center py-16 text-center"><span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary"><Icon className="size-6 text-muted-foreground" /></span><p className="text-sm text-muted-foreground">{text}</p><Button asChild variant="outline" size="sm" className="mt-4"><Link href="/">ตีเลขจากฝันแรก</Link></Button></div>;
}
