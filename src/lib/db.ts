import postgres from "postgres";

// camp スキーマ専用ロール（camp_app）で Supabase の接続プーラー経由でつなぐ。
// DATABASE_URL 例: postgres://camp_app.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
const g = globalThis as unknown as { __campSql?: postgres.Sql };

export const sql: postgres.Sql =
  g.__campSql ??
  (g.__campSql = postgres(process.env.DATABASE_URL || "postgres://invalid@localhost:5432/none", {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
  }));

export type Member = {
  id: string;
  email: string;
  name: string;
  plan: "tool" | "school_a" | "school_b" | "school_single" | "school_single2";
  is_student: boolean;
  student_status: "none" | "pending" | "approved" | "rejected";
  status: "active" | "past_due" | "canceled";
  track: string;
  current_stage: number;
  setup_step: number;
  core_completed: boolean;
  line_user_id: string | null;
  line_link_code: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  school_invoices_paid: number;
  continuation: boolean;
  referrer: string;
  notes: string;
  joined_at: Date;
};

export type Stage = {
  id: number;
  track: string;
  no: number;
  month: number;
  title: string;
  body: string;
  task: string;
  rubric: string;
};
