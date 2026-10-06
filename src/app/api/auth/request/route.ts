import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashCode, randomDigits } from "@/lib/session";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email: raw } = (await req.json().catch(() => ({}))) as { email?: string };
  const email = String(raw || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, message: "メールアドレスを確認してください" }, { status: 400 });
  }
  // 連続送信の制限（10分で5回まで）
  const recent = await sql<{ n: number }[]>`
    select count(*)::int as n from camp.login_codes where email = ${email} and created_at > now() - interval '10 minutes'`;
  if (recent[0].n >= 5) {
    return NextResponse.json({ ok: false, message: "少し時間をおいてから、もう一度お試しください" }, { status: 429 });
  }
  const member = await sql`select id from camp.members where email = ${email}`;
  // 会員でなくても同じ返事（登録の有無を外に漏らさない）
  if (member.length) {
    const code = randomDigits(6);
    await sql`insert into camp.login_codes (email, code_hash, expires_at)
      values (${email}, ${hashCode(email, code)}, now() + interval '15 minutes')`;
    const ok = await sendMail(
      email,
      `【AI Creator Camp】ログインコード ${code}`,
      `ログインコードは ${code} です。\n15分以内に入力してください。\n\n心当たりがない場合は、このメールは無視してください。\n\nAI Creator Camp`,
    );
    if (!ok) {
      return NextResponse.json({ ok: false, message: "メールを送れませんでした。時間をおいてお試しください" }, { status: 500 });
    }
  } else {
    await sql`insert into camp.login_codes (email, code_hash, expires_at, used) values (${email}, 'none', now(), true)`;
  }
  return NextResponse.json({ ok: true });
}
