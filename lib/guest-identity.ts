import { createHash } from "node:crypto";

export const GUEST_TOKEN_HEADER = "x-teehauy-guest";

export function readGuestToken(request: Request): string | null {
  const token = request.headers.get(GUEST_TOKEN_HEADER)?.trim();
  if (!token || token.length < 16 || token.length > 200) return null;
  return token;
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function readGuestHash(request: Request): string | null {
  const token = readGuestToken(request);
  return token ? hashGuestToken(token) : null;
}
