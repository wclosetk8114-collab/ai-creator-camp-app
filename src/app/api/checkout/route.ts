import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, priceFor } from "@/lib/stripe";
import { appUrl } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const f = await req.formData();
  const plan = String(f.get("plan") || "");
  const email = String(f.get("email") || "").trim().toLowerCase();
  const name = String(f.get("name") || "").trim().slice(0, 80);
  const ref = String(f.get("ref") || "").trim().slice(0, 80);
  const student = f.get("student") === "1";
  const agree = f.get("agree") === "1";
  const back = (msg: string) => NextResponse.redirect(`${appUrl()}/join?error=${encodeURIComponent(msg)}`, 303);

  if (!["tool", "school_a", "school_b"].includes(plan)) return back("プランを選んでください");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return back("メールアドレスを確認してください");
  if (!name) return back("お名前を入れてください");
  if (!agree) return back("利用規約への同意が必要です");

  const ctx = await getStripe();
  if (!ctx) return back("ただいま決済の準備中です。少し時間をおいてお試しください");
  const { stripe, s } = ctx;
  const p = priceFor(s, plan as "tool", student);
  const metadata = { plan, student: student ? "1" : "0", name, ref };
  const base: Stripe.Checkout.SessionCreateParams = {
    customer_email: email,
    metadata,
    locale: "ja",
    success_url: `${appUrl()}/join/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/join?plan=${plan}${student ? "&student=1" : ""}`,
    allow_promotion_codes: true,
  };

  let session: Stripe.Checkout.Session;
  try {
    if (plan === "tool") {
      session = await stripe.checkout.sessions.create({
        ...base,
        mode: "payment",
        customer_creation: "always",
        line_items: [{ price: p.tool, quantity: 1 }],
      });
    } else {
      session = await stripe.checkout.sessions.create({
        ...base,
        mode: "subscription",
        line_items: [
          { price: p.tool, quantity: 1 },
          { price: p.school!, quantity: 1 },
        ],
        subscription_data: {
          metadata,
          // 分割プラン：1ヶ月目はツール代のみ。スクール代は2ヶ月目から
          ...(plan === "school_a" ? { trial_period_days: 30 } : {}),
        },
      });
    }
  } catch (e) {
    console.error("checkout error", e);
    return back("決済ページを開けませんでした。時間をおいてお試しください");
  }
  return NextResponse.redirect(session.url!, 303);
}
