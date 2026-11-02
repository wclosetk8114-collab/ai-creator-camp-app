import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 特別枠：ツールを買った人が、スクールに 月5,000円×3回 で入る直リンク
// /api/checkout-camp3（学生は ?student=1 → 4ヶ月目からの専門コースが1,990円）
// メールアドレスは Stripe の画面で入力してもらう（ツール購入時と同じアドレスで会員にひもづく）
export async function GET(req: Request) {
  const u = new URL(req.url);
  const student = u.searchParams.get("student") === "1";
  const ctx = await getStripe();
  if (!ctx) return new NextResponse("ただいま決済の準備中です", { status: 503 });
  const { stripe } = ctx;
  const metadata = { plan: "school_m3", student: student ? "1" : "0", name: "", ref: "" };
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "ja",
      metadata,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: 5000,
          recurring: { interval: "month" },
          product_data: { name: "AI Creator Camp スクール（ツール購入者・月5,000円×3ヶ月）" },
        },
      }],
      subscription_data: { metadata },
      custom_text: { submit: { message: "ツールを購入したときと同じメールアドレスでお支払いください。スクール代は月5,000円×3回。4ヶ月目から専門コース（月" + (student ? "1,990" : "3,980") + "円・いつでも解約可）に切り替わります。" } },
      success_url: `${appUrl()}/join/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (e) {
    console.error("checkout-camp3 error", e);
    return new NextResponse("決済ページを開けませんでした。時間をおいてお試しください", { status: 500 });
  }
}
