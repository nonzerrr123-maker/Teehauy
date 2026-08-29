import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const SESSION_COOKIE = "teehauy_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

function getSql() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  return neon(databaseUrl);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function accountOwnerHash(userId: string): string {
  return createHash("sha256").update(`account:${userId}`, "utf8").digest("hex");
}

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, salt, expectedHex] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function parseCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function sessionCookie(token: string, maxAge = SESSION_TTL_SECONDS): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function createAccount(params: {
  email: string;
  password: string;
  displayName?: string;
  guestOwnerHash?: string | null;
}): Promise<AuthUser> {
  const sql = getSql();
  const email = normalizeEmail(params.email);
  const displayName = params.displayName?.trim().slice(0, 60) || "นักตีเลข";
  const passwordHash = await hashPassword(params.password);

  const rows = await sql`
    INSERT INTO public.app_users (email, password_hash, display_name)
    VALUES (${email}, ${passwordHash}, ${displayName})
    RETURNING id, email, display_name, password_hash
  `;

  const row = rows[0] as UserRow;
  const ownerHash = accountOwnerHash(row.id);

  if (params.guestOwnerHash) {
    await claimGuestData(params.guestOwnerHash, ownerHash);
  }

  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function authenticateAccount(emailInput: string, password: string, guestOwnerHash?: string | null): Promise<AuthUser | null> {
  const sql = getSql();
  const email = normalizeEmail(emailInput);
  const rows = await sql`
    SELECT id, email, display_name, password_hash
    FROM public.app_users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;

  if (!rows.length) return null;
  const row = rows[0] as UserRow;
  if (!(await verifyPassword(password, row.password_hash))) return null;

  if (guestOwnerHash) {
    await claimGuestData(guestOwnerHash, accountOwnerHash(row.id));
  }

  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function createSession(userId: string): Promise<string> {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await sql`
    INSERT INTO public.app_sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, now() + interval '30 days')
  `;
  return token;
}

export async function getSessionUser(request: Request): Promise<AuthUser | null> {
  const token = parseCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const sql = getSql();
  const tokenHash = hashToken(token);
  const rows = await sql`
    SELECT u.id, u.email, u.display_name, u.password_hash
    FROM public.app_sessions AS s
    JOIN public.app_users AS u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > now()
    LIMIT 1
  `;
  if (!rows.length) return null;

  const row = rows[0] as UserRow;
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function deleteCurrentSession(request: Request): Promise<void> {
  const token = parseCookie(request, SESSION_COOKIE);
  if (!token) return;
  const sql = getSql();
  await sql`DELETE FROM public.app_sessions WHERE token_hash = ${hashToken(token)}`;
}

async function claimGuestData(guestOwnerHash: string, accountHash: string): Promise<void> {
  if (guestOwnerHash === accountHash) return;
  const sql = getSql();

  await sql`UPDATE public.dream_interpretations SET owner_hash = ${accountHash} WHERE owner_hash = ${guestOwnerHash}`;
  await sql`
    INSERT INTO public.dream_favorites (owner_hash, interpretation_id, created_at)
    SELECT ${accountHash}, interpretation_id, created_at
    FROM public.dream_favorites
    WHERE owner_hash = ${guestOwnerHash}
    ON CONFLICT (owner_hash, interpretation_id) DO NOTHING
  `;
  await sql`DELETE FROM public.dream_favorites WHERE owner_hash = ${guestOwnerHash}`;
}
