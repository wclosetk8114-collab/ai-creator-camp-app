import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { POST as checkout } from "../checkout-sns/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 申し込みフォーム（sns-apply.html / sns-oct.html）の送信直後に呼ばれる。
// その人専用の Stripe 支払いページをつくり、支払いリンクと「このあとやること」をメールで送る。
export async function POST(req: Request) {
  let d: Record<string, string> = {};
  try { d = JSON.parse(await req.text()); } catch { return NextResponse.json({ ok: false }); }
  if (d.company) return NextResponse.json({ ok: true }); // ボット対策
  const name = String(d.name || "").trim().slice(0, 80);
  const email = String(d.email || "").trim().toLowerCase().slice(0, 200);
  const plan = d.plan === "sns_camp" ? "sns_camp" : "sns";
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false });
  const promo = d.promo === "oct2026";
  const owned = d.owned === "1";
  const student = d.student === "1";

  // 決済ページ（Stripe）を、申し込みと同じ条件でつくる
  const f = new FormData();
  f.set("plan", plan); f.set("name", name); f.set("email", email); f.set("agree", "1");
  f.set("ref", String(d.ref || "").slice(0, 80));
  if (student) f.set("student", "1");
  if (promo) { f.set("promo", "oct2026"); f.set("owned", owned ? "1" : "0"); }
  const res = await checkout(new Request("https://local/api/checkout-sns", { method: "POST", body: f }));
  const url = res.headers.get("location") || "";
  if (!url.startsWith("https://checkout.stripe.com/")) return NextResponse.json({ ok: false });

  const price = promo
    ? owned
      ? ["・毎月 5,000円 × 6ヶ月（計30,000円・税込）", "　1回目のお支払い日と同じ日に、毎月自動でお支払いになります。"]
      : ["・1回目：15,000円（コース代 5,000円＋ツール代 10,000円）", "・2ヶ月目〜6ヶ月目：毎月 5,000円", "　1回目のお支払い日と同じ日に、毎月自動でお支払いになります。"]
    : plan === "sns_camp"
      ? ["・毎月 7,000円 × 6ヶ月（計42,000円・税込）", "　1回目のお支払い日と同じ日に、毎月自動でお支払いになります。"]
      : student
        ? ["・毎月 5,000円 × 6ヶ月（計30,000円・税込）", "　1回目のお支払い日と同じ日に、毎月自動でお支払いになります。"]
        : ["・毎月 10,000円 × 6ヶ月（計60,000円・税込）", "　1回目のお支払い日と同じ日に、毎月自動でお支払いになります。"];

  const body = [
    `${name} 様`,
    "",
    "AI×SNS自動化コースにお申し込みいただき、ありがとうございます。",
    "AI Creator Camp のつっちーです。",
    "",
    "お申し込みの画面からそのままお支払いに進まれた方は、このメールは読み飛ばしていただいて大丈夫です。",
    "まだお支払いがお済みでない方は、下のリンクからお支払いをお願いします。",
    "",
    "──────────────────",
    "▼お支払いページ（クレジットカード）",
    url,
    "※このリンクの有効期限は24時間です。",
    "──────────────────",
    "",
    "■ お支払い金額",
    ...price,
    "",
    "■ お支払いの流れ",
    "1. 上のリンクを押すと、お支払い画面（Stripe）が開きます",
    "2. カード番号・有効期限・セキュリティコード・お名前を入力します",
    "3. いちばん下の「申し込む」ボタンを押したら完了です",
    "",
    "■ お支払いのあとにやること",
    "1. 「はじめにやること」のメールが届きます",
    "2. マイページにログインします（メールアドレスだけでログインできます）",
    "3. マイページに出ている「LINE連携コード」を、公式LINEに送ります",
    ...(promo && !owned ? ["4. マイページからツールを受け取り、手順書のとおりに設定します"] : []),
    "",
    "■ このコースでやること",
    "SNSの投稿づくり・投稿・数字のチェックを、AIが毎日自動でやってくれる仕組みを、半年かけて自分でつくれるようになるコースです。",
    "",
    "・1〜2ヶ月目：自動で「つくる」",
    "　発信の軸を決めて、AIで文章・画像・動画をまとめてつくれるようになります。",
    "・3〜4ヶ月目：自動で「出す」",
    "　つくった投稿が、複数のSNSに毎日自動で出る仕組みをつくります。",
    "・5〜6ヶ月目：自動で「測る」",
    "　数字のレポートと改善案が自動で届く仕組みをつくり、自分の集客や仕事に使えるようにします。",
    "",
    "■ 1週間の流れ（目安は週2〜4時間）",
    "・月曜日：その週の課題が届きます",
    "・火〜土曜日：ご都合のよい時間に取り組みます",
    "・日曜日23:59まで：公式LINEから課題を提出します",
    "",
    "わからないことは、公式LINEに送ればAIがいつでもすぐに答えます。",
    "月に1回は、つっちーに直接相談できる相談会もあります。",
    "最初の課題がいつから始まるかは、お支払いのあとに改めてご案内します。",
    "",
    "ご不明な点があれば、このメールにそのままご返信ください。",
    "これから半年間、どうぞよろしくお願いします。",
    "",
    "つっちー（AI Creator Camp）",
    "お問い合わせ：ai.creator.camp2026@gmail.com",
  ].join("\n");

  const ok = await sendMail(email, "【AI×SNS自動化コース】お支払いページとこれからのご案内", body);
  return NextResponse.json({ ok });
}
