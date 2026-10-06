import { notFound } from "next/navigation";
import { sql, type Member } from "@/lib/db";
import { fmtDate } from "@/lib/camp";
import { TRACKS } from "@/lib/settings";
import { messageMember, updateMember, viewAsMember } from "../../actions";

export const dynamic = "force-dynamic";

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const m = (await sql<Member[]>`select * from camp.members where id = ${id}`)[0];
  if (!m) notFound();
  const subs = await sql<{ id: number; track: string; stage_no: number; verdict: string; content: string; feedback: string; created_at: Date; by_admin: boolean }[]>`
    select id, track, stage_no, verdict, content, feedback, created_at, by_admin from camp.submissions where member_id = ${id} order by created_at desc limit 30`;
  const msgs = await sql<{ role: string; content: string; created_at: Date }[]>`
    select role, content, created_at from camp.messages where member_id = ${id} order by created_at desc limit 40`;
  return (
    <>
      <h1>{m.name || m.email}</h1>
      <p className="muted">{m.email}　／　入会 {new Date(m.joined_at).toLocaleDateString("ja-JP")}　／　連携コード {m.line_link_code}　／　スクール代 支払い{m.school_invoices_paid}回</p>

      <form action={viewAsMember} style={{ marginBottom: 12 }}>
        <input type="hidden" name="id" value={m.id} />
        <button className="btn small ghost">この人のマイページを見る</button>
      </form>

      <form action={updateMember} className="card">
        <input type="hidden" name="id" value={m.id} />
        <div className="grid2">
          <div><label>名前</label><input type="text" name="name" defaultValue={m.name} /></div>
          <div><label>プラン</label>
            <select name="plan" defaultValue={m.plan}>
              <option value="school_a">スクールつき・分割</option>
              <option value="school_b">スクールつき・月額</option>
              <option value="school_single">スクール（ツール購入後に追加）</option>
              <option value="tool">ツールのみ</option>
            </select></div>
          <div><label>状態</label>
            <select name="status" defaultValue={m.status}>
              <option value="active">有効</option><option value="past_due">未払い</option><option value="canceled">解約</option>
            </select></div>
          <div><label>学生</label>
            <div className="row">
              <label className="check" style={{ margin: 0 }}><input type="checkbox" name="is_student" value="1" defaultChecked={m.is_student} /> 学生</label>
              <select name="student_status" defaultValue={m.student_status} style={{ width: "auto" }}>
                <option value="none">-</option><option value="pending">確認待ち</option><option value="approved">承認</option><option value="rejected">非承認</option>
              </select>
            </div></div>
          <div><label>コース</label>
            <select name="track" defaultValue={m.track}>
              <option value="core">基礎（90日）</option>
              {Object.entries(TRACKS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label>いまのステージ</label><input type="number" name="current_stage" min={1} defaultValue={m.current_stage} /></div>
          <div><label>ツール導入ステップ（7で完了）</label><input type="number" name="setup_step" min={1} defaultValue={m.setup_step} /></div>
        </div>
        <label className="check"><input type="checkbox" name="core_completed" value="1" defaultChecked={m.core_completed} /> 基礎修了</label>
        <label>メモ（運営だけが見る）</label>
        <textarea name="notes" defaultValue={m.notes} style={{ minHeight: 70 }} />
        <button className="btn small" style={{ marginTop: 8 }}>保存</button>
      </form>

      <h2>LINEでメッセージを送る</h2>
      {m.line_user_id ? (
        <form action={messageMember} className="card">
          <input type="hidden" name="id" value={m.id} />
          <textarea name="body" required style={{ minHeight: 70 }} />
          <button className="btn small" style={{ marginTop: 6 }}>送る</button>
        </form>
      ) : <p className="muted">まだLINEと連携していません（連携コード：{m.line_link_code}）。</p>}

      <h2>提出（{subs.length}）</h2>
      {subs.map((s) => (
        <div key={s.id} className="card">
          <div className="row">
            <span className={`pill ${s.verdict === "pass" ? "ok" : s.verdict === "retry" ? "warn" : ""}`}>{s.verdict}</span>
            <span>{s.track === "core" ? "基礎" : TRACKS[s.track]} Stage {s.stage_no}</span>
            <span className="muted">{fmtDate(s.created_at)}{s.by_admin ? "・運営判定" : ""}</span>
          </div>
          <p className="pre" style={{ marginTop: 6 }}>{s.content}</p>
          <p className="pre muted">{s.feedback}</p>
        </div>
      ))}

      <h2>LINEのやりとり（新しい順）</h2>
      <div className="card">
        {msgs.length === 0 && <p className="muted">まだありません</p>}
        {msgs.map((x, i) => (
          <div key={i} style={{ borderBottom: "1px dashed #e4e8ee", padding: "6px 0" }}>
            <span className="pill">{x.role === "user" ? "本人" : x.role === "assistant" ? "AI" : "運営"}</span>
            <span className="muted"> {fmtDate(x.created_at)}</span>
            <div className="pre" style={{ fontSize: 14 }}>{x.content}</div>
          </div>
        ))}
      </div>
    </>
  );
}
