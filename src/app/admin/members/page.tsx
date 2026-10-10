import Link from "next/link";
import { sql, type Member } from "@/lib/db";
import { PLANS, TRACKS } from "@/lib/settings";
import { addMember, bulkAddMembers } from "../actions";

export const dynamic = "force-dynamic";

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string; msg?: string }> }) {
  const { q = "", msg } = await searchParams;
  const like = `%${q}%`;
  const rows = await sql<Member[]>`
    select * from camp.members where ${q} = '' or email ilike ${like} or name ilike ${like}
    order by joined_at desc limit 300`;
  return (
    <>
      <h1>会員（{rows.length}）</h1>
      {msg && <div className="warnbox">{msg}</div>}
      <form className="row" style={{ marginBottom: 12 }}>
        <input type="text" name="q" defaultValue={q} placeholder="名前・メールで検索" style={{ maxWidth: 320 }} />
        <button className="btn small">検索</button>
      </form>
      <div className="card scroll">
        <table>
          <thead><tr><th>名前</th><th>プラン</th><th>状態</th><th>進み具合</th><th>LINE</th><th>入会</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/admin/members/${m.id}`}>{m.name || "（名前なし）"}</Link><div className="muted">{m.email}</div></td>
                <td>{PLANS[m.plan]?.label}{m.is_student ? <div className="muted">学生：{m.student_status}</div> : null}{m.continuation ? <div className="muted">専門コース</div> : null}</td>
                <td><span className={`pill ${m.status === "active" ? "ok" : m.status === "past_due" ? "warn" : "ng"}`}>{m.status === "active" ? "有効" : m.status === "past_due" ? "未払い" : "解約"}</span></td>
                <td>{m.plan === "tool" ? "-" : `${m.track === "core" ? "基礎" : TRACKS[m.track]} Stage ${m.current_stage}`}{m.core_completed ? <div className="muted">基礎修了</div> : null}</td>
                <td>{m.line_user_id ? "済" : <span className="muted">未</span>}</td>
                <td className="muted">{new Date(m.joined_at).toLocaleDateString("ja-JP")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>手動で会員を追加</h2>
      <p className="muted">銀行振込・招待など、Stripeを通さずに入れる場合。本人はこのメールアドレスでログインできます。</p>
      <form action={addMember} className="card">
        <div className="grid2">
          <input type="email" name="email" placeholder="メールアドレス" required />
          <input type="text" name="name" placeholder="名前" />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <select name="plan" style={{ width: "auto" }}>
            <option value="school_a">スクールつき・分割</option>
            <option value="school_b">スクールつき・月額</option>
            <option value="tool">ツールのみ</option>
          </select>
          <label className="check" style={{ margin: 0 }}><input type="checkbox" name="is_student" value="1" /> 学生</label>
          <button className="btn small">追加</button>
        </div>
      </form>

      <h2>まとめて追加（先にスタートしている人など）</h2>
      <p className="muted">1行に1人、「名前, メールアドレス」で貼りつけてください。案内メールで、ログイン・公式LINE・連携コードの手順が届きます。</p>
      <form action={bulkAddMembers} className="card">
        <textarea name="list" required placeholder={"山田花子, hanako@example.com\n佐藤太郎, taro@example.com"} style={{ minHeight: 160 }} />
        <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
          <select name="plan" style={{ width: "auto" }}>
            <option value="school_a">スクールつき・分割</option>
            <option value="school_b">スクールつき・月額</option>
            <option value="tool">ツールのみ</option>
          </select>
          <label className="check" style={{ margin: 0 }}><input type="checkbox" name="skip_setup" value="1" defaultChecked /> ツールの準備は済んでいる（Stage 1 から始める）</label>
          <label className="check" style={{ margin: 0 }}><input type="checkbox" name="invite" value="1" defaultChecked /> 案内メールを送る</label>
          <button className="btn small">まとめて追加</button>
        </div>
      </form>
    </>
  );
}
