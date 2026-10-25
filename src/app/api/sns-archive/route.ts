import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI×SNS自動化コース 説明会アーカイブの申し込み（フォームは artigia リポの sns-archive-apply.html）
// 申し込んだ人に、アーカイブのリンクと10月限定価格のご案内を自動で送る
const FORM = "https://ai-creator-camp-theta.vercel.app/sns-archive-apply.html";
const ARCHIVE_PAGE = "https://ai-creator-camp-theta.vercel.app/sns-archive.html";
const ARCHIVE_PASS = "xb5&VfUk";
const OFFER_URL = "https://ai-creator-camp-theta.vercel.app/sns-oct.html";
const OFFER_END = Date.parse("2026-11-01T00:00:00+09:00");

export async function POST(req: Request) {
  const f = await req.formData();
  const back = (q: string) => NextResponse.redirect(`${FORM}?${q}`, 303);
  if (String(f.get("company") || "")) return back("done=1"); // ボット対策
  const name = String(f.get("name") || "").trim().slice(0, 80);
  const email = String(f.get("email") || "").trim().toLowerCase().slice(0, 200);
  if (!name) return back("error=" + encodeURIComponent("お名前を入れてください"));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return back("error=" + encodeURIComponent("メールアドレスを確認してください"));

  const offer = Date.now() < OFFER_END;
  const lines = [
    `${name} 様`,
    "",
    "このたびは、AI×SNS自動化コースの説明会アーカイブにお申し込みいただき、誠にありがとうございます。",
    "AI Creator Camp のつっちーです。",
    "",
    "説明会のアーカイブ（録画）をお送りいたします。",
    "ご都合のよいときに、ぜひご覧ください。",
    "",
    "──────────────────",
    "■ 説明会アーカイブ（約65分）",
    ARCHIVE_PAGE,
    `パスコード：${ARCHIVE_PASS}`,
    "──────────────────",
    "",
    "■ 今回のスクールについて",
    "今回のスクールを、リアルタイムで開催するのは今回限りです。",
    "次回は、募集そのものを行わない可能性が高い状況です。",
    "",
    ...(offer
      ? [
          "■ 10月限定の特別価格",
          "アーカイブをご覧いただいた方だけに、10月限定の特別価格をご用意しました。",
          "",
          "通常　月10,000円 × 6ヶ月（計60,000円）",
          "↓",
          "特別価格　月5,000円 × 6ヶ月（計30,000円・税込）",
          "",
          "※この価格にツールは含まれません。",
          "　ツールをまだお持ちでない方は、初回にツール代10,000円が加わります",
          "　（初回15,000円、2ヶ月目から月5,000円）。",
          "",
          "締め切り：10月31日（土）23:59まで",
          "",
          "▼お申し込みはこちら",
          OFFER_URL,
          "",
          "今回が、最初で最後の機会になるかもしれません。",
          "少しでも気になっている方は、この機会を逃さず、ぜひお申し込みください。",
          "",
        ]
      : [
          "▼コースのお申し込みはこちら",
          "https://ai-creator-camp-theta.vercel.app/sns-apply.html",
          "",
        ]),
    "ご質問があれば、このメールにそのままご返信ください。",
    "最後までお読みいただき、ありがとうございました。",
    "",
    "つっちー（AI Creator Camp）",
    "お問い合わせ：ai.creator.camp2026@gmail.com",
  ];
  const ok = await sendMail(email, "【説明会アーカイブ】AI×SNS自動化コース" + (offer ? "／10月限定の特別価格のご案内" : ""), lines.join("\n"));

  const s = await getSettings();
  if (s.admin_email) {
    await sendMail(
      s.admin_email,
      `【アーカイブ申込】${name}`,
      `AI×SNS自動化コースの説明会アーカイブに申し込みがありました。\n\nお名前：${name}\nメール：${email}\n自動返信：${ok ? "送信済み" : "失敗（手動で送ってください）"}`,
    );
  }
  if (!ok) return back("error=" + encodeURIComponent("メールを送れませんでした。お手数ですが ai.creator.camp2026@gmail.com までご連絡ください"));
  return back("done=1");
}
