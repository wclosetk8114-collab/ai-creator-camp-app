// AI×SNS自動化コース（キャンプの単体コース）。金額はすべて税込。
// 月額×6ヶ月。6回払い終わったら、通常・学生は専門コース（月3,980円／学生1,990円）へ自動で切替。
// キャンプ受講中の人（sns_camp）は6回で終了（専門コースはキャンプ側で払うため）。
// ツールをまだ持っていない人は、会員（plan=tool）として登録されるので、ツールがついてくる。
export const SNS_PLANS = {
  sns: { label: "AI×SNS自動化コース", monthly: 10000, studentMonthly: 5000 },
  sns_camp: { label: "AI×SNS自動化コース（キャンプ受講生）", monthly: 7000, studentMonthly: 7000 },
} as const;
export type SnsPlan = keyof typeof SNS_PLANS;
export const SNS_PAYMENTS = 6;
export const SNS_FORM_URL = "https://ai-creator-camp-theta.vercel.app/sns-apply.html";

export function snsPriceKey(plan: SnsPlan, student: boolean) {
  if (plan === "sns_camp") return "price_sns_camp";
  return student ? "price_sns_student" : "price_sns";
}

export function snsPriceIds(s: Record<string, string>) {
  return new Set(["price_sns", "price_sns_student", "price_sns_camp"].map((k) => s[k]).filter(Boolean));
}
