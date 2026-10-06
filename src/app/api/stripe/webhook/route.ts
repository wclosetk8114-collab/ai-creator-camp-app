import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sql, type Member } from "@/lib/db";
import { getStripe, schoolPaymentsNeeded, schoolPriceIds, priceFor } from "@/lib/stripe";
import { sendMail } from "@/lib/mail";
import { appUrl, PLANS, yen } from "@/lib/settings";
import { newLinkCode } from "@/lib/camp";
import { push, text } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await getStripe();
  if (!ctx) return NextResponse.json({ error: "stripe not configured" }, { status: 400 });
  const { stripe, s } = ctx;
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const whsec = s.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || "";
  let event: Stripe.Event;
  try {
    if (!sig || !whsec) throw new Error("missing signature");
    event = await stripe.webhooks.constructEventAsync(body, sig, whsec);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const seen = await sql`insert into camp.stripe_events (id) values (${event.id}) on conflict do nothing returning id`;
  if (!seen.length) return NextResponse.json({ ok: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckout(event.data.object as Stripe.Checkout.Session, s);
        break;
      case "invoice.paid":
        await onInvoicePaid(event.data.object as Stripe.Invoice, stripe, s);
        break;
      case "invoice.payment_failed": {
        const subId = invoiceSubId(event.data.object as Stripe.Invoice);
        if (subId) await sql`update camp.members set status = 'past_due' where stripe_subscription_id = ${subId}`;
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await sql`update camp.members set status = 'canceled' where stripe_subscription_id = ${sub.id}`;
        break;
      }
    }
  } catch (e) {
    console.error("webhook handler error", e);
    await sql`delete from camp.stripe_events where id = ${event.id}`;
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

function invoiceSubId(inv: Stripe.Invoice): string | null {
  const legacy = (inv as unknown as { subscription?: string | { id: string } }).subscription;
  const fromParent = inv.parent?.subscription_details?.subscription;
  const v = fromParent ?? legacy;
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

async function onCheckout(cs: Stripe.Checkout.Session, s: Record<string, string>) {
  const md = cs.metadata || {};
  const plan = (md.plan as Member["plan"]) || "tool";
  const student = md.student === "1";
  const email = (cs.customer_details?.email || cs.customer_email || "").toLowerCase().trim();
  if (!email) return;
  const name = md.name || cs.customer_details?.name || "";
  const customer = typeof cs.customer === "string" ? cs.customer : cs.customer?.id || null;
  const subscription = typeof cs.subscription === "string" ? cs.subscription : cs.subscription?.id || null;

  const existing = await sql<Member[]>`select * from camp.members where email = ${email}`;
  let member: Member;
  if (existing.length) {
    const cur = existing[0];
    const newPlan = cur.plan !== "tool" && plan === "tool" ? cur.plan : plan;
    const r = await sql<Member[]>`
      update camp.members set
        name = coalesce(nullif(${name}, ''), name),
        plan = ${newPlan},
        is_student = ${student} or is_student,
        student_status = case when ${student} and student_status = 'none' then 'pending' else student_status end,
        status = 'active',
        stripe_customer_id = coalesce(${customer}, stripe_customer_id),
        stripe_subscription_id = coalesce(${subscription}, stripe_subscription_id)
      where id = ${cur.id} returning *`;
    member = r[0];
  } else {
    const code = await newLinkCode();
    const r = await sql<Member[]>`
      insert into camp.members (email, name, plan, is_student, student_status, stripe_customer_id, stripe_subscription_id, referrer, line_link_code)
      values (${email}, ${name}, ${plan}, ${student}, ${student ? "pending" : "none"}, ${customer}, ${subscription}, ${md.ref || ""}, ${code})
      returning *`;
    member = r[0];
  }
  await sql`insert into camp.purchases (member_id, stripe_session_id, plan, is_student, amount)
    values (${member.id}, ${cs.id}, ${plan}, ${student}, ${cs.amount_total || 0}) on conflict (stripe_session_id) do nothing`;

  const p = PLANS[plan];
  const lines = [
    `${member.name || ""}さん`,
    "",
    "AI Creator Camp へのお申し込み、ありがとうございます。",
    `プラン：${p.label}${student ? "（学生）" : ""}`,
    "",
    "■ はじめにやること",
    `1. マイページにログイン（メールアドレスだけでログインできます）`,
    `   ${appUrl()}/login`,
    "2. マイページに出ている「LINE連携コード」を、公式LINEに送る",
    s.line_friend_url ? `   公式LINE：${s.line_friend_url}` : "",
    "3. ツールの受け取りと手順書は、マイページから",
    student ? "\n※学生価格のかたは、公式LINEで「学生証」と送ってから、学生証の写真を送ってください。" : "",
    "",
    "わからないことは、公式LINEにそのまま送ってください。",
    "",
    "AI Creator Camp",
  ];
  await sendMail(email, "【AI Creator Camp】お申し込みありがとうございます", lines.filter((l) => l !== "").join("\n"));
  if (s.admin_email) {
    await sendMail(
      s.admin_email,
      `【新規申込】${member.name || email}（${p.label}${student ? "・学生" : ""}）`,
      `名前：${member.name}\nメール：${email}\nプラン：${p.label}${student ? "（学生）" : ""}\n金額：${yen(cs.amount_total || 0)}\n紹介者：${md.ref || "-"}\n管理画面：${appUrl()}/admin/members/${member.id}`,
    );
  }
}

async function onInvoicePaid(inv: Stripe.Invoice, stripe: Stripe, s: Record<string, string>) {
  const subId = invoiceSubId(inv);
  if (!subId) return;
  const rows = await sql<Member[]>`select * from camp.members where stripe_subscription_id = ${subId}`;
  const m = rows[0];
  if (!m) return;
  if (m.status === "past_due") await sql`update camp.members set status = 'active' where id = ${m.id}`;
  if (m.continuation || m.plan === "tool") return;
  if (m.plan === "school_single") {
    // スクール代は一括済み。専門コース（月額）の初回が払われたら切替扱い
    const contIds = new Set([s.price_cont, s.price_cont_student].filter(Boolean));
    const paidCont = (inv.lines?.data || []).some((l) => {
      const pid = l.pricing?.price_details?.price ?? (l as unknown as { price?: { id: string } }).price?.id;
      return pid && contIds.has(pid) && l.amount > 0;
    });
    if (paidCont) await sql`update camp.members set continuation = true where id = ${m.id}`;
    return;
  }

  const school = schoolPriceIds(s);
  const paidSchool = (inv.lines?.data || []).some((l) => {
    const pid = l.pricing?.price_details?.price ?? (l as unknown as { price?: { id: string } }).price?.id;
    return pid && school.has(pid) && l.amount > 0;
  });
  if (!paidSchool) return;

  const r = await sql<{ n: number }[]>`
    update camp.members set school_invoices_paid = school_invoices_paid + 1 where id = ${m.id} returning school_invoices_paid as n`;
  const n = r[0].n;
  if (n < schoolPaymentsNeeded(m.plan)) return;

  // スクール代を払い終えた → 次回から専門コース（月3,980円／学生1,990円）へ切り替え
  const sub = await stripe.subscriptions.retrieve(subId);
  const item = sub.items.data.find((it) => school.has(it.price.id));
  const cont = priceFor(s, m.plan, m.is_student && m.student_status !== "rejected").cont;
  if (item && cont) {
    // 分割（あとからスクール）は2回払いで終わるので、専門コースの請求は申込から90日後に始める
    const day90 = sub.start_date + 90 * 24 * 3600;
    const waitUntil90 = m.plan === "school_single2" && day90 > Math.floor(Date.now() / 1000) + 3600;
    await stripe.subscriptions.update(subId, {
      items: [{ id: item.id, price: cont }],
      proration_behavior: "none",
      ...(waitUntil90 ? { trial_end: day90 } : {}),
      metadata: { ...sub.metadata, stage: "continuation" },
    });
  }
  await sql`update camp.members set continuation = true where id = ${m.id}`;
  if (m.line_user_id && s.line_access_token) {
    await push(s.line_access_token, m.line_user_id, [
      text(`スクール代のお支払いは今回で完了です。ありがとうございました。
次回から、専門コース（月${m.is_student ? "1,990" : "3,980"}円）に自動で切り替わります。
基礎の課題がまだ残っていても、そのまま続けられます。`),
    ]);
  }
}
