import { NextResponse } from "next/server";
import { getMember } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const m = await getMember();
  if (!m) return NextResponse.redirect(`${appUrl()}/login`, 303);
  const ctx = await getStripe();
  if (!ctx || !m.stripe_customer_id) return NextResponse.redirect(`${appUrl()}/me?e=portal`, 303);
  try {
    const p = await ctx.stripe.billingPortal.sessions.create({ customer: m.stripe_customer_id, return_url: `${appUrl()}/me` });
    return NextResponse.redirect(p.url, 303);
  } catch (e) {
    console.error("portal error", e);
    return NextResponse.redirect(`${appUrl()}/me?e=portal`, 303);
  }
}
