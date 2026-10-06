import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashCode, setMemberSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email: raw, code: rawCode } = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
  const email = String(raw || "").trim().toLowerCase();
  const code = String(rawCode || "").replace(/\D/g, "");
  const rows = await sql<{ id: number; code_hash: string; attempts: number }[]>`
    select id, code_hash, attempts from camp.login_codes
    where email = ${email} and used = false and expires_at > now()
    order by created_at desc limit 1`;
  const row = rows[0];
  if (!row || row.attempts >= 5) {
    return NextResponse.json({ ok: false, message: "コードの期限が切れました。もう一度送ってください" }, { status: 400 });
  }
  if (row.code_hash !== hashCode(email, code)) {
    await sql`update camp.login_codes set attempts = attempts + 1 where id = ${row.id}`;
    return NextResponse.json({ ok: false, message: "コードがちがいます" }, { status: 400 });
  }
  await sql`update camp.login_codes set used = true where id = ${row.id}`;
  const m = await sql<{ id: string }[]>`select id from camp.members where email = ${email}`;
  if (!m.length) return NextResponse.json({ ok: false, message: "会員が見つかりません" }, { status: 400 });
  await setMemberSession(m[0].id);
  return NextResponse.json({ ok: true });
}
