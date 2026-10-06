import crypto from "crypto";
import { cookies } from "next/headers";
import { sql, type Member } from "./db";

const secret = () => process.env.SESSION_SECRET || "dev-secret-change-me";

export function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verify<T>(token?: string | null): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp?: number };
    if (p.exp && p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

const MEMBER_COOKIE = "camp_s";
const ADMIN_COOKIE = "camp_a";
const DAY = 24 * 60 * 60 * 1000;

export async function setMemberSession(mid: string) {
  const c = await cookies();
  c.set(MEMBER_COOKIE, sign({ mid, exp: Date.now() + 30 * DAY }), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600,
  });
}

export async function clearMemberSession() {
  (await cookies()).delete(MEMBER_COOKIE);
}

export async function getMember(): Promise<Member | null> {
  const c = await cookies();
  const p = verify<{ mid: string }>(c.get(MEMBER_COOKIE)?.value);
  if (!p) return null;
  const rows = await sql<Member[]>`select * from camp.members where id = ${p.mid}`;
  return rows[0] ?? null;
}

export async function setAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, sign({ admin: true, exp: Date.now() + 7 * DAY }), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return !!verify<{ admin: boolean }>(c.get(ADMIN_COOKIE)?.value)?.admin;
}

export function hashCode(email: string, code: string) {
  return crypto.createHmac("sha256", secret()).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function randomDigits(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += crypto.randomInt(0, 10).toString();
  return s;
}
