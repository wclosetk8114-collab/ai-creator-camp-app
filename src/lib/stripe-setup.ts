import Stripe from "stripe";
import { appUrl, setSetting } from "./settings";

// 管理画面で入れた Stripe アカウント（AIクリエイター）に、価格8本とWebhookを自動で作る。
// lookup_key で探すので、何回押しても重複しない。
const CATALOG = [
  { key: "price_tool", name: "AI Creator Camp 開発ツール一式", amount: 30000, recurring: false, desc: "Claudeに差し込むプラグイン一式＋設定手順書（買い切り・税込）" },
  { key: "price_tool_student", name: "AI Creator Camp 開発ツール一式（学生）", amount: 15000, recurring: false, desc: "学生価格（買い切り・税込）" },
  { key: "price_school_a", name: "AI Creator Camp スクール（分割プラン）", amount: 10000, recurring: true, desc: "2・3ヶ月目に月10,000円。4ヶ月目から月3,980円の専門コースへ自動で切替（税込）" },
  { key: "price_school_a_student", name: "AI Creator Camp スクール（分割プラン・学生）", amount: 5000, recurring: true, desc: "学生価格。2・3ヶ月目に月5,000円（税込）" },
  { key: "price_school_b", name: "AI Creator Camp スクール（月額プラン）", amount: 20000, recurring: true, desc: "1〜3ヶ月目に月20,000円。4ヶ月目から月3,980円の専門コースへ自動で切替（税込）" },
  { key: "price_school_b_student", name: "AI Creator Camp スクール（月額プラン・学生）", amount: 10000, recurring: true, desc: "学生価格。1〜3ヶ月目に月10,000円（税込）" },
  { key: "price_cont", name: "AI Creator Camp 専門コース", amount: 3980, recurring: true, desc: "修了後の専門特化コース（月額・税込）" },
  { key: "price_cont_student", name: "AI Creator Camp 専門コース（学生）", amount: 1990, recurring: true, desc: "修了後の専門特化コース・学生価格（月額・税込）" },
];

const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.deleted",
];

export async function setupStripeCatalog(secretKey: string): Promise<{ ok: boolean; message: string }> {
  const stripe = new Stripe(secretKey);
  try {
    const account = await stripe.accounts.retrieve();
    const accountName = account.settings?.dashboard?.display_name || account.business_profile?.name || account.id;

    const lookups = CATALOG.map((c) => `camp_${c.key}`);
    const existing = await stripe.prices.list({ lookup_keys: lookups, active: true, limit: 20 });
    const byLookup = new Map(existing.data.map((p) => [p.lookup_key, p]));
    let created = 0;
    for (const c of CATALOG) {
      const lk = `camp_${c.key}`;
      let price = byLookup.get(lk);
      if (!price || price.unit_amount !== c.amount) {
        const product = await stripe.products.create({ name: c.name, description: c.desc });
        price = await stripe.prices.create({
          product: product.id,
          currency: "jpy",
          unit_amount: c.amount,
          lookup_key: lk,
          transfer_lookup_key: true,
          ...(c.recurring ? { recurring: { interval: "month" } } : {}),
        });
        created++;
      }
      await setSetting(c.key, price.id);
    }

    // Webhook：同じURLのものは作り直して、署名シークレットを保存する
    const url = `${appUrl()}/api/stripe/webhook`;
    const eps = await stripe.webhookEndpoints.list({ limit: 100 });
    for (const ep of eps.data) if (ep.url === url) await stripe.webhookEndpoints.del(ep.id);
    const wh = await stripe.webhookEndpoints.create({ url, enabled_events: EVENTS, description: "AI Creator Camp 会員アプリ" });
    if (wh.secret) await setSetting("stripe_webhook_secret", wh.secret);

    return {
      ok: true,
      message: `Stripe「${accountName}」${secretKey.includes("_live_") ? "（本番）" : "（テスト）"}に、価格8本（新規${created}本）とWebhookを設定しました。`,
    };
  } catch (e) {
    return { ok: false, message: `Stripeの設定に失敗しました：${String((e as Error).message || e).slice(0, 200)}` };
  }
}
