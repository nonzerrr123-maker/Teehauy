"use client";

import { useCallback, useEffect, useState } from "react";

import { BottomNav, StarsBackground, type DreamTab } from "@/components/dream/common";
import { DictionaryPage } from "@/components/dream/dictionary-page";
import { HistoryPage } from "@/components/dream/history-page";
import { HomePage } from "@/components/dream/home-page";
import { ProfilePage } from "@/components/dream/profile-page";
import { ResultsPage } from "@/components/dream/results-page";
import { StatsPage } from "@/components/dream/stats-page";
import { defaultHistory } from "@/lib/dream-catalog";
import { interpretDream, type DreamResult } from "@/lib/dream-engine";

type InterpretApiResponse =
  | { ok: true; result: DreamResult }
  | { ok: false; error: string; message: string };

export default function DreamApp() {
  const [activeTab, setActiveTab] = useState<DreamTab>("home");
  const [showResults, setShowResults] = useState(false);
  const [currentResult, setCurrentResult] = useState<DreamResult | null>(null);
  const [savedResults, setSavedResults] = useState<DreamResult[]>(defaultHistory);
  const [favorites, setFavorites] = useState<DreamResult[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const history = localStorage.getItem("teehauy:history");
      const favs = localStorage.getItem("teehauy:favorites");
      if (history) setSavedResults(JSON.parse(history) as DreamResult[]);
      if (favs) setFavorites(JSON.parse(favs) as DreamResult[]);
    } catch {
      // Ignore malformed prototype data and keep safe defaults.
    } finally {
      setHydrated(true);
    }
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
      const response = await fetch("/api/dream/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamText: normalized }),
        cache: "no-store",
      });

      const payload = (await response.json()) as InterpretApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "ตีความความฝันไม่สำเร็จ" : payload.message);
      }

      result = payload.result;
    } catch {
      // Keep the app usable while the server/API is temporarily unavailable.
      // This fallback can be removed after persistent backend + monitoring are online.
      result = interpretDream(normalized);
      setInterpretError("เชื่อมต่อระบบตีความไม่ได้ชั่วคราว จึงใช้โหมดสำรองบนอุปกรณ์นี้");
    } finally {
      setIsInterpreting(false);
    }

    setCurrentResult(result);
    setShowResults(true);
    setActiveTab("home");
    setSavedResults((prev) => [result, ...prev].slice(0, 30));
  }, []);

  const toggleFavorite = useCallback((result: DreamResult) => {
    setFavorites((prev) => {
      const exists = prev.some((item) => item.dreamText === result.dreamText && item.date === result.date);
      return exists
        ? prev.filter((item) => !(item.dreamText === result.dreamText && item.date === result.date))
        : [result, ...prev];
    });
  }, []);

  const isFavorite = useCallback(
    (result: DreamResult) => favorites.some((item) => item.dreamText === result.dreamText && item.date === result.date),
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
            onFavorite={() => toggleFavorite(currentResult)}
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
            onFavorite={toggleFavorite}
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
