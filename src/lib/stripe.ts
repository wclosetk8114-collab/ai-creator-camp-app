import Stripe from "stripe";
import { getSettings, type Settings } from "./settings";

export async function getStripe(): Promise<{ stripe: Stripe; s: Settings } | null> {
  const s = await getSettings();
  const key = s.stripe_secret_key || process.env.STRIPE_SECRET_KEY || "";
  if (!key) return null;
  return { stripe: new Stripe(key), s };
}

export function priceFor(s: Settings, plan: "tool" | "school_a" | "school_b" | "school_single" | "school_single2", student: boolean) {
  const suf = student ? "_student" : "";
  return {
    tool: s[`price_tool${suf}`],
    school: plan === "tool" ? null : s[`price_${plan}${suf}`],
    cont: s[`price_cont${suf}`],
  };
}

export function schoolPriceIds(s: Settings) {
  return new Set(
    ["price_school_a", "price_school_a_student", "price_school_b", "price_school_b_student", "price_school_single2", "price_school_single2_student"].map((k) => s[k]).filter(Boolean),
  );
}

/** スクール代を何回払ったら専門コース（3,980円）に切り替えるか */
export function schoolPaymentsNeeded(plan: string) {
  return plan === "school_a" || plan === "school_single2" ? 2 : 3;
}
