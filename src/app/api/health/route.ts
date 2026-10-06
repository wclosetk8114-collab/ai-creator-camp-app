import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = { app: "ai-creator-camp-app" };
  try {
    const r = await sql<{ n: number }[]>`select count(*)::int as n from camp.stages`;
    out.db = "ok";
    out.stages = r[0].n;
    const s = await getSettings();
    out.line = !!(s.line_channel_secret && s.line_access_token);
    out.stripe = !!s.stripe_secret_key;
    out.stripe_webhook = !!s.stripe_webhook_secret;
    out.mail = !!(s.gas_mail_url || s.resend_api_key);
  } catch (e) {
    out.db = "error";
    out.error = String((e as Error).message || e).slice(0, 200);
  }
  out.ai = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json(out);
}
