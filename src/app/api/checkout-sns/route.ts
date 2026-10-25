import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/settings";
import { sql } from "@/lib/db";
import { SNS_FORM_URL, snsPriceKey, type SnsPlan } from "@/lib/sns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI×SNS自動化コースの決済（申し込みフォームは artigia リポの sns-apply.html）
export async function POST(req: Request) {
  const f = await req.formData();
  const plan = String(f.get("plan") || "") as SnsPlan;
  const email = String(f.get("email") || "").trim().toLowerCase();
  const name = String(f.get("name") || "").trim().slice(0, 80);
  const ref = String(f.get("ref") || "").trim().slice(0, 80);
  const student = f.get("student") === "1" && plan === "sns";
  // 説明会参加者向け 10月限定価格（月5,000円×6ヶ月）。2026/10/31 23:59（日本時間）まで
  const promo = f.get("promo") === "oct2026" && plan === "sns" && Date.now() < Date.parse("2026-11-01T00:00:00+09:00");
  const back = (msg: string) => NextResponse.redirect(`${SNS_FORM_URL}?error=${encodeURIComponent(msg)}`, 303);

  if (!["sns", "sns_camp"].includes(plan)) return back("プランを選んでください");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return back("メールアドレスを確認してください");
  if (!name) return back("お名前を入れてください");
  if (f.get("agree") !== "1") return back("利用規約への同意が必要です");

  const ctx = await getStripe();
  if (!ctx) return back("ただいま決済の準備中です");
  const { stripe, s } = ctx;
  const price = s[snsPriceKey(plan, student || promo)];
  if (!price) return back("ただいま決済の準備中です");
  // 10月限定価格はツール別。まだ会員でない（＝ツールを持っていない）人には、ツール代 10,000円を初回に足す
  let needTool = false;
  if (promo) {
    const rows = await sql<{ id: string }[]>`select id from camp.members where email = ${email} limit 1`;
    needTool = rows.length === 0;
  }
  const metadata = { course: "sns", plan, student: student ? "1" : "0", name, ref, promo: promo ? "oct2026" : "", tool: needTool ? "1" : "0" };
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      metadata,
      locale: "ja",
      line_items: needTool
        ? [{ price, quantity: 1 }, { price_data: { currency: "jpy", unit_amount: 10000, product_data: { name: "AI Creator Camp 開発ツール一式（10月限定）" } }, quantity: 1 }]
        : [{ price, quantity: 1 }],
      subscription_data: { metadata },
      success_url: `${appUrl()}/join/thanks?course=sns`,
      cancel_url: SNS_FORM_URL,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (e) {
    console.error("sns checkout error", e);
    return back("決済ページを開けませんでした。時間をおいてお試しください");
  }
}
