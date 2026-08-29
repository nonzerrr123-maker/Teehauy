"use client";

import { useCallback, useEffect, useState } from "react";

import { BottomNav, StarsBackground, type DreamTab } from "@/components/dream/common";
import { DictionaryPage } from "@/components/dream/dictionary-page";
import { HistoryPage } from "@/components/dream/history-page";
import { HomePage } from "@/components/dream/home-page";
import { ProfilePage } from "@/components/dream/profile-page";
import { ResultsPage } from "@/components/dream/results-page";
import { StatsPage } from "@/components/dream/stats-page";
import { getOrCreateGuestToken } from "@/lib/browser-guest";
import { interpretDream, type DreamResult } from "@/lib/dream-engine";

type InterpretApiResponse =
  | { ok: true; result: DreamResult; persisted?: boolean }
  | { ok: false; error: string; message: string };

type HistoryApiResponse =
  | { ok: true; history: DreamResult[]; favorites: DreamResult[] }
  | { ok: false; error: string; message: string };

function sameResult(a: DreamResult, b: DreamResult): boolean {
  if (a.id && b.id) return a.id === b.id;
  return a.dreamText === b.dreamText && a.date === b.date;
}

function mergeResults(primary: DreamResult[], secondary: DreamResult[], limit = 100): DreamResult[] {
  const merged: DreamResult[] = [];
  for (const item of [...primary, ...secondary]) {
    if (!merged.some((existing) => sameResult(existing, item))) merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

export default function DreamApp() {
  const [activeTab, setActiveTab] = useState<DreamTab>("home");
  const [showResults, setShowResults] = useState(false);
  const [currentResult, setCurrentResult] = useState<DreamResult | null>(null);
  const [savedResults, setSavedResults] = useState<DreamResult[]>([]);
  const [favorites, setFavorites] = useState<DreamResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let localHistory: DreamResult[] = [];
      let localFavorites: DreamResult[] = [];

      try {
        const history = localStorage.getItem("teehauy:history");
        const favs = localStorage.getItem("teehauy:favorites");
        if (history) localHistory = JSON.parse(history) as DreamResult[];
        if (favs) localFavorites = JSON.parse(favs) as DreamResult[];
      } catch {
        // Ignore malformed legacy data.
      }

      setSavedResults(localHistory);
      setFavorites(localFavorites);
      setHydrated(true);

      const guestToken = getOrCreateGuestToken();
      void fetch("/api/dream/history", {
        method: "GET",
        headers: { "x-teehauy-guest": guestToken },
        cache: "no-store",
      })
        .then(async (response) => ({ response, payload: (await response.json()) as HistoryApiResponse }))
        .then(({ response, payload }) => {
          if (!response.ok || !payload.ok) return;
          setSavedResults((current) => mergeResults(payload.history, current, 30));
          setFavorites((current) => mergeResults(payload.favorites, current, 100));
        })
        .catch(() => {
          // Local persistence remains available when the database is offline.
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("teehauy:history", JSON.stringify(savedResults));
  }, [hydrated, savedResults]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("teehauy:favorites", JSON.stringify(favorites));
  }, [favorites, hydrated]);

  const handleInterpret = useCallback(async (dreamText: string) => {
    const normalized = dreamText.trim();
    if (normalized.length < 2 || normalized.length > 300) return;

    setIsInterpreting(true);
    setInterpretError(null);

    let result: DreamResult;

    try {
      const guestToken = getOrCreateGuestToken();
      const response = await fetch("/api/dream/interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-teehauy-guest": guestToken,
        },
        body: JSON.stringify({ dreamText: normalized }),
        cache: "no-store",
      });

      const payload = (await response.json()) as InterpretApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "ตีความความฝันไม่สำเร็จ" : payload.message);
      }

      result = payload.result;
    } catch {
      result = interpretDream(normalized);
      setInterpretError("เชื่อมต่อระบบตีความไม่ได้ชั่วคราว จึงใช้โหมดสำรองบนอุปกรณ์นี้");
    } finally {
      setIsInterpreting(false);
    }

    setCurrentResult(result);
    setShowResults(true);
    setActiveTab("home");
    setSavedResults((prev) => mergeResults([result], prev, 30));
  }, []);

  const toggleFavorite = useCallback(async (result: DreamResult) => {
    let shouldFavorite = true;

    setFavorites((prev) => {
      const exists = prev.some((item) => sameResult(item, result));
      shouldFavorite = !exists;
      return exists
        ? prev.filter((item) => !sameResult(item, result))
        : mergeResults([result], prev, 100);
    });

    if (!result.id) return;

    try {
      const guestToken = getOrCreateGuestToken();
      await fetch("/api/dream/favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-teehauy-guest": guestToken,
        },
        body: JSON.stringify({ interpretationId: result.id, favorite: shouldFavorite }),
        cache: "no-store",
      });
    } catch {
      // Optimistic local favorite state remains usable offline.
    }
  }, []);

  const isFavorite = useCallback(
    (result: DreamResult) => favorites.some((item) => sameResult(item, result)),
    [favorites],
  );

  const changeTab = (tab: DreamTab) => {
    setActiveTab(tab);
    if (tab !== "home") setShowResults(false);
    if (tab === "home") setInterpretError(null);
  };

  return (
    <div className="app-shell">
      <StarsBackground />

      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
        {activeTab === "home" && !showResults ? (
          <HomePage onInterpret={handleInterpret} isLoading={isInterpreting} error={interpretError} />
        ) : null}

        {activeTab === "home" && showResults && currentResult ? (
          <ResultsPage
            result={currentResult}
            favorite={isFavorite(currentResult)}
            onFavorite={() => void toggleFavorite(currentResult)}
            onBack={() => {
              setShowResults(false);
              setInterpretError(null);
            }}
          />
        ) : null}

        {activeTab === "dictionary" ? (
          <DictionaryPage onInterpret={handleInterpret} isLoading={isInterpreting} />
        ) : null}

        {activeTab === "history" ? (
          <HistoryPage
            results={savedResults}
            favorites={favorites}
            isFavorite={isFavorite}
            onFavorite={(result) => void toggleFavorite(result)}
            onInterpret={handleInterpret}
            isLoading={isInterpreting}
          />
        ) : null}

        {activeTab === "stats" ? <StatsPage /> : null}
        {activeTab === "profile" ? <ProfilePage historyCount={savedResults.length} favoriteCount={favorites.length} /> : null}
      </div>

      <BottomNav activeTab={activeTab} onChange={changeTab} />
    </div>
  );
}
