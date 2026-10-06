import Link from "next/link";
import { sql } from "@/lib/db";
import { fmtDate } from "@/lib/camp";
import { getSettings, yen } from "@/lib/settings";
import { broadcast, decideStudent, replyTicket } from "./actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const k = (await sql<Record<string, number>[]>`
    select
      count(*) filter (where status <> 'canceled')::int as active,
      count(*) filter (where plan <> 'tool' and status <> 'canceled')::int as school,
      count(*) filter (where plan = 'tool')::int as tool,
      count(*) filter (where continuation and status <> 'canceled')::int as cont,
      count(*) filter (where line_user_id is not null)::int as linked,
      count(*) filter (where core_completed)::int as graduated
    from camp.members`)[0];
  const sales = (await sql<{ n: number }[]>`select coalesce(sum(amount),0)::int as n from camp.purchases where created_at > date_trunc('month', now())`)[0].n;
  const tickets = await sql<{ id: number; kind: string; content: string; created_at: Date; image_id: string | null; member_id: string | null; name: string | null; email: string | null }[]>`
    select t.id, t.kind, t.content, t.created_at, t.image_id, t.member_id, m.name, m.email
    from camp.tickets t left join camp.members m on m.id = t.member_id
    where t.status = 'open' order by t.created_at limit 50`;
  const setupMissing = [
    !s.line_access_token && "LINE",
    !s.stripe_secret_key && "Stripeのキー",
    !s.stripe_webhook_secret && "StripeのWebhook",
    !(s.gas_mail_url || s.resend_api_key) && "メール送信",
    !s.tool_download_url && "ツールの受け取りURL",
  ].filter(Boolean);

  const kindLabel: Record<string, string> = { human: "人と話したい", escalated: "AIから引き継ぎ", review: "審査エラー", student_id: "学生証", question: "質問" };

  return (
    <>
      <h1>ダッシュボード</h1>
      {setupMissing.length > 0 && (
        <div className="warnbox">まだ設定が必要です：{setupMissing.join("・")}　→ <Link href="/admin/settings">設定へ</Link></div>
      )}
      {sp.sent && <div className="okbox">{sp.sent}人に送りました</div>}
      <div className="kpis">
        <div className="kpi"><b>{k.active}</b><span>有効な会員</span></div>
        <div className="kpi"><b>{k.school}</b><span>スクール</span></div>
        <div className="kpi"><b>{k.tool}</b><span>ツールのみ</span></div>
        <div className="kpi"><b>{k.cont}</b><span>専門コース（3,980円）</span></div>
        <div className="kpi"><b>{k.graduated}</b><span>基礎修了</span></div>
        <div className="kpi"><b>{k.linked}</b><span>LINE連携済み</span></div>
        <div className="kpi"><b>{yen(sales)}</b><span>今月の申込額</span></div>
      </div>

      <h2>対応が必要なこと（{tickets.length}）</h2>
      <p className="muted">AIが答えられなかった相談・人と話したい人・学生証など。返信はLINEに届きます。</p>
      {tickets.length === 0 && <div className="card">いまはありません。AIが回しています。</div>}
      {tickets.map((t) => (
        <div className="card" key={t.id}>
          <div className="row">
            <span className="pill warn">{kindLabel[t.kind] || t.kind}</span>
            {t.member_id ? <Link href={`/admin/members/${t.member_id}`}>{t.name || t.email}</Link> : <span>（会員なし）</span>}
            <span className="muted">{fmtDate(t.created_at)}</span>
          </div>
          <p className="pre" style={{ marginTop: 8 }}>{t.content}</p>
          {t.kind === "student_id" && t.image_id ? (
            <>
              <a href={`/admin/line-image/${t.image_id}`} target="_blank"><img src={`/admin/line-image/${t.image_id}`} alt="学生証" style={{ maxHeight: 240, borderRadius: 10 }} /></a>
              <form action={decideStudent} className="row" style={{ marginTop: 8 }}>
                <input type="hidden" name="member_id" value={t.member_id || ""} />
                <input type="hidden" name="ticket_id" value={t.id} />
                <button className="btn small" name="decision" value="approve">学生として承認</button>
                <button className="btn small ghost" name="decision" value="reject">承認しない</button>
              </form>
            </>
          ) : (
            <form action={replyTicket}>
              <input type="hidden" name="id" value={t.id} />
              <textarea name="body" placeholder="LINEで返信する内容（空のまま「対応済み」も可）" style={{ minHeight: 70 }} />
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn small">返信して完了</button>
                <button className="btn small ghost" name="close" value="1">返信せず完了</button>
              </div>
            </form>
          )}
        </div>
      ))}

      <h2>LINEで一斉に送る</h2>
      <form action={broadcast} className="card">
        <textarea name="body" placeholder="お知らせの内容" required />
        <div className="row" style={{ marginTop: 8 }}>
          <select name="target" style={{ width: "auto" }}>
            <option value="school">スクールの人だけ</option>
            <option value="all">全員（ツールのみの人も）</option>
          </select>
          <button className="btn small">送る</button>
        </div>
        <p className="muted" style={{ margin: "6px 0 0" }}>※LINE公式の無料プランは、こちらから送るメッセージが月200通までです。</p>
      </form>
    </>
  );
}
