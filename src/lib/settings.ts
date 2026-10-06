import { sql } from "./db";

export type Settings = Record<string, string>;

export async function getSettings(): Promise<Settings> {
  const rows = await sql<{ key: string; value: string }[]>`select key, value from camp.settings`;
  const s: Settings = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

export async function setSetting(key: string, value: string) {
  await sql`
    insert into camp.settings (key, value, updated_at) values (${key}, ${value}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// プラン定義（表示用）。金額はすべて税込。学生は半額。
export const PLANS = {
  tool: {
    label: "ツールのみ",
    summary: "開発ツール一式（買い切り）",
    regular: { first: 30000, monthly: 0, months: 0, total: 30000 },
    student: { first: 15000, monthly: 0, months: 0, total: 15000 },
  },
  school_a: {
    label: "スクールつき・分割",
    summary: "ツール＋90日スクール。初回にツール代、2・3ヶ月目にスクール代",
    regular: { first: 30000, monthly: 10000, months: 2, total: 50000 },
    student: { first: 15000, monthly: 5000, months: 2, total: 25000 },
  },
  school_b: {
    label: "スクールつき・月額",
    summary: "ツール＋90日スクール。スクール代を毎月",
    regular: { first: 50000, monthly: 20000, months: 2, total: 90000 },
    student: { first: 25000, monthly: 10000, months: 2, total: 45000 },
  },
  school_single: {
    label: "スクール（ツール購入後に追加）",
    summary: "ツールを持っている人が、あとからスクールに入る",
    regular: { first: 50000, monthly: 0, months: 0, total: 50000 },
    student: { first: 25000, monthly: 0, months: 0, total: 25000 },
  },
} as const;

export const CONT_PRICE = { regular: 3980, student: 1990 };

export const TRACKS: Record<string, string> = {
  video: "動画・画像",
  app: "アプリ・ツール開発",
  dx: "業務自動化・DX",
  art: "ゲーム・漫画・アート",
};

export function yen(n: number) {
  return n.toLocaleString("ja-JP") + "円";
}
