import Link from "next/link";
import { sql } from "@/lib/db";
import { fmtDate } from "@/lib/camp";
import { TRACKS } from "@/lib/settings";
import { overrideSubmission } from "../actions";

export const dynamic = "force-dynamic";

export default async function Submissions({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v = "" } = await searchParams;
  const rows = await sql<{ id: number; member_id: string; name: string; email: string; track: string; stage_no: number; verdict: string; score: number | null; content: string; feedback: string; has_image: boolean; by_admin: boolean; created_at: Date }[]>`
    select s.*, m.name, m.email from camp.submissions s join camp.members m on m.id = s.member_id
    where ${v} = '' or s.verdict = ${v}
    order by s.created_at desc limit 100`;
  return (
    <>
      <h1>提出・審査</h1>
      <p className="muted">AIが自動で審査しています。判定を変えたいときだけ、ここで上書きしてください（本人のLINEに届きます）。</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link href="/admin/submissions" className="btn small ghost">すべて</Link>
        <Link href="/admin/submissions?v=pending" className="btn small ghost">確認待ち</Link>
        <Link href="/admin/submissions?v=retry" className="btn small ghost">やり直し</Link>
        <Link href="/admin/submissions?v=pass" className="btn small ghost">合格</Link>
      </div>
      {rows.map((s) => (
        <div key={s.id} className="card">
          <div className="row">
            <span className={`pill ${s.verdict === "pass" ? "ok" : s.verdict === "retry" ? "warn" : ""}`}>{s.verdict}{s.score !== null ? ` ${s.score}点` : ""}</span>
            <Link href={`/admin/members/${s.member_id}`}>{s.name || s.email}</Link>
            <span>{s.track === "core" ? "基礎" : TRACKS[s.track]} Stage {s.stage_no}</span>
            <span className="muted">{fmtDate(s.created_at)}{s.has_image ? "・画像あり" : ""}{s.by_admin ? "・運営判定" : ""}</span>
          </div>
          <p className="pre" style={{ marginTop: 6 }}>{s.content || "（文章なし）"}</p>
          <p className="pre muted">AI：{s.feedback}</p>
          <form action={overrideSubmission} className="row">
            <input type="hidden" name="id" value={s.id} />
            <input type="text" name="note" placeholder="本人へのひとこと（任意）" style={{ flex: 1, minWidth: 200 }} />
            <button className="btn small" name="verdict" value="pass">合格にする</button>
            <button className="btn small ghost" name="verdict" value="retry">やり直しにする</button>
          </form>
        </div>
      ))}
    </>
  );
}
