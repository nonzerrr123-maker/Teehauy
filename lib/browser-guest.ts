const STORAGE_KEY = "teehauy:guest-token";

export function getOrCreateGuestToken(): string {
  const existing = localStorage.getItem(STORAGE_KEY)?.trim();
  if (existing && existing.length >= 16) return existing;

  const token = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, token);
  return token;
}

export function getExistingGuestToken(): string | null {
  const existing = localStorage.getItem(STORAGE_KEY)?.trim();
  return existing && existing.length >= 16 ? existing : null;
}
