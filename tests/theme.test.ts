import { describe, expect, it } from "vitest";

import { isThemePreference } from "../lib/theme";

describe("theme preferences", () => {
  it.each(["light", "dark", "system"])("accepts %s", (theme) => {
    expect(isThemePreference(theme)).toBe(true);
  });

  it.each(["", "auto", "sepia", null, undefined])("rejects %s", (theme) => {
    expect(isThemePreference(theme)).toBe(false);
  });
});
