"use client";

import { useCallback, useEffect, useState } from "react";

import { MobileAppShell } from "@/components/app/mobile-app-shell";
import { HomePage } from "@/components/dream/home-page";
import { ResultsPage } from "@/components/dream/results-page";
import { interpretDream, type DreamClarificationResolution, type DreamResult } from "@/lib/dream-engine";

type InterpretApiResponse = { ok: true; result: DreamResult; persisted?: boolean } | { ok: false; error: string; message: string };
type HistoryApiResponse = { ok: true; history: DreamResult[]; favorites: DreamResult[] } | { ok: false; error: string; message: string };

function sameResult(a: DreamResult, b: DreamResult) {
  if (a.id && b.id) return a.id === b.id;
  return a.dreamText === b.dreamText && a.date === b.date;
}

function mergeResults(primary: DreamResult[], secondary: DreamResult[], limit = 100) {
  const merged: DreamResult[] = [];
  for (const item of [...primary, ...secondary]) {
    if (!merged.some((existing) => sameResult(existing, item))) merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

export default function DreamApp({ userId }: { userId: string }) {
  const [currentResult, setCurrentResult] = useState<DreamResult | null>(null);
  const [favorites, setFavorites] = useState<DreamResult[]>([]);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/dream/history", { cache: "no-store" })
      .then(async (response) => ({ response, payload: (await response.json()) as HistoryApiResponse }))
      .then(({ response, payload }) => {
        if (active && response.ok && payload.ok) setFavorites(payload.favorites);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const handleInterpret = useCallback(async (dreamText: string, clarification?: DreamClarificationResolution) => {
    const normalized = dreamText.trim();
    if (normalized.length < 2 || normalized.length > 300) return;
    setIsInterpreting(true);
    setInterpretError(null);
    let result: DreamResult;
    try {
      const response = await fetch("/api/dream/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dreamText: normalized, clarification }), cache: "no-store" });
      const payload = (await response.json()) as InterpretApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "ตีความความฝันไม่สำเร็จ" : payload.message);
      result = payload.result;
    } catch {
      result = interpretDream(normalized, clarification);
      setInterpretError("ระบบออนไลน์ขัดข้องชั่วคราว ผลนี้สร้างจากโหมดสำรองและยังไม่ซิงก์");
    } finally {
      setIsInterpreting(false);
    }
    setCurrentResult(result);
  }, []);

  const toggleFavorite = useCallback(async (result: DreamResult) => {
    const exists = favorites.some((item) => sameResult(item, result));
    setFavorites((current) => exists ? current.filter((item) => !sameResult(item, result)) : mergeResults([result], current));
    if (!result.id) return;
    await fetch("/api/dream/favorite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interpretationId: result.id, favorite: !exists }), cache: "no-store" }).catch(() => undefined);
  }, [favorites]);

  return (
    <MobileAppShell userId={userId}>
      {currentResult ? (
        <ResultsPage result={currentResult} favorite={favorites.some((item) => sameResult(item, currentResult))} isInterpreting={isInterpreting} onClarify={(resolution) => void handleInterpret(currentResult.dreamText, resolution)} onFavorite={() => void toggleFavorite(currentResult)} onBack={() => { setCurrentResult(null); setInterpretError(null); }} />
      ) : (
        <HomePage onInterpret={handleInterpret} isLoading={isInterpreting} error={interpretError} />
      )}
    </MobileAppShell>
  );
}
