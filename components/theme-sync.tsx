"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { applyThemePreference, isThemePreference } from "@/lib/theme";

export function ThemeSync() {
  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const syncTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        applyThemePreference("system");
        return;
      }

      const { data } = await supabase.from("user_preferences").select("theme").eq("user_id", user.id).single();
      if (active && isThemePreference(data?.theme)) applyThemePreference(data.theme);
    };

    void syncTheme();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void syncTheme(); }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
