import { redirect } from "next/navigation";
import Shell from "../Shell";
import { getMember } from "@/lib/session";
import { sql } from "@/lib/db";
import { getSettings, PLANS, TRACKS, CONT_PRICE, yen } from "@/lib/settings";
import { currentStage, fmtDate, hasSchool, listStages, newLinkCode, stageCount, upcomingEvents } from "@/lib/camp";
import SubmitBox from "./SubmitBox";
import { chooseTrackAction, rsvpAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Me({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  let m = await getMember();
  if (!m) redirect("/login");
  if (!m.line_link_code) {
    const code = await newLinkCode();
    await sql`update camp.members set line_link_code = ${code} where id = ${m.id}`;
    m = { ...m, line_link_code: code };
  }
  const s = await getSettings();
  const school = hasSchool(m);
  const stage = await currentStage(m);
  const stages = school ? await listStages(m.track) : [];
  const total = stages.length;
  const done = Math.min(m.current_stage - 1, total);
  const subs = await sql<{ stage_no: number; track: string; verdict: string; feedback: string; created_at: Date }[]>`
    select stage_no, track, verdict, feedback, created_at from camp.submissions where member_id = ${m.id} order by created_at desc limit 5`;
  const events = school ? await upcomingEvents(3) : [];
  const myRsvp = new Map(
    (await sql<{ event_id: number; status: string }[]>`select event_id, status from camp.rsvps where member_id = ${m.id}`).map((r) => [
      Number(r.event_id),
      r.status,
    ]),
  );
  const plan = PLANS[m.plan];
  const setupTotal = await stageCount("setup");
  const setupDone = Math.min(m.setup_step - 1, setupTotal);

  return (
    <Shell
      right={
        <form method="post" action="/api/auth/logout">
          <button className="btn small ghost">ログアウト</button>
        </form>
      }
    >
      <h1>{m.name || "マイページ"}さん</h1>
      <div className="row">
        <span className="pill">{plan.label}{m.is_student ? "（学生）" : ""}</span>
        {m.continuation && <span className="pill ok">専門コース 月{yen(m.is_student ? CONT_PRICE.student : CONT_PRICE.regular)}</span>}
        {m.status === "past_due" && <span className="pill ng">お支払いが確認できていません</span>}
        {m.status === "canceled" && <span className="pill ng">解約済み</span>}
        {m.is_student && m.student_status === "pending" && <span className="pill warn">学生証の確認待ち</span>}
      </div>
      {sp.e === "portal" && <div className="err">お支払いページを開けませんでした。公式LINEで「スタッフ」と送ってください。</div>}
      {sp.e && sp.e !== "portal" && <div className="err">{sp.e}</div>}
      {sp.upgraded && <div className="okbox">スクールのお申し込み、ありがとうございます。公式LINEで「いまの課題」と送ると始められます。</div>}

      {/* LINE連携 */}
      <h2>公式LINE</h2>
      {m.line_user_id ? (
        <div className="card soft">
          <p style={{ margin: 0 }}>LINEとつながっています。課題の提出も相談も、LINEでできます。</p>
          {s.line_friend_url && <p style={{ margin: "8px 0 0" }}><a href={s.line_friend_url}>公式LINEを開く</a></p>}
        </div>
      ) : (
        <div className="card grad-border">
          <p>公式LINEを友だち追加して、このコードを送ってください。</p>
          <div className="code">{m.line_link_code}</div>
          {s.line_friend_url ? (
            <a className="btn" href={s.line_friend_url} style={{ marginTop: 10 }}>公式LINEを友だち追加</a>
          ) : (
            <p className="muted">公式LINEの準備中です。もうしばらくお待ちください。</p>
          )}
        </div>
      )}
      {m.is_student && m.student_status === "pending" && (
        <div className="warnbox">学生価格のかたは、公式LINEで「学生証」と送ってから、学生証の写真を送ってください。</div>
      )}

      {/* ツール */}
      <h2>ツール</h2>
      <div className="card">
        <h3>開発ツール一式</h3>
        <p className="muted">Claudeに差し込むプラグイン一式と、設定の手順書です。</p>
        <p style={{ margin: "0 0 8px" }}>
          導入 {setupDone} / {setupTotal} ステップ{setupDone >= setupTotal ? "（完了）" : "　→ 公式LINEで「導入」と送ると、続きから1ステップずつ案内します"}
        </p>
        <div className="row">
          {s.tool_download_url ? <a className="btn small" href={s.tool_download_url} target="_blank">ツールを受け取る</a> : <span className="muted">準備中</span>}
          {s.tool_guide_url && <a className="btn small ghost" href={s.tool_guide_url} target="_blank">手順書を見る</a>}
        </div>
      </div>

      {/* スクール */}
      {school ? (
        <>
          <h2>{m.track === "core" ? "90日のカリキュラム" : `専門コース：${TRACKS[m.track] || m.track}`}</h2>
          <div className="progress"><div style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
          <p className="muted">{done} / {total} ステージ合格</p>

          {stage ? (
            <div className="card grad-border">
              <span className="pill">{stage.track === "core" ? `Month${stage.month}・` : ""}Stage {stage.no}</span>
              <h3 style={{ marginTop: 8 }}>{stage.title}</h3>
              <p className="pre">{stage.body}</p>
              <div className="card soft">
                <strong>課題</strong>
                <p className="pre" style={{ margin: 0 }}>{stage.task}</p>
              </div>
              <p className="muted">LINEで「提出」と送るか、ここから提出できます。AIがすぐ審査します。</p>
              <SubmitBox />
            </div>
          ) : (
            <div className="card grad-border">
              {m.core_completed && m.track === "core" ? (
                <h3>基礎の90日、修了です。次の専門を選んでください。</h3>
              ) : (
                <h3>このコースの課題はすべて合格です。別の専門にも進めます。</h3>
              )}
              <div className="row" style={{ marginTop: 10 }}>
                {Object.entries(TRACKS).map(([k, v]) => (
                  <form key={k} action={chooseTrackAction}>
                    <input type="hidden" name="track" value={k} />
                    <button className="btn small ghost">{v}</button>
                  </form>
                ))}
              </div>
            </div>
          )}

          <ul className="stages">
            {stages.map((st) => (
              <li key={st.id} className={st.no < m!.current_stage ? "done" : st.no === m!.current_stage ? "now" : ""}>
                <span className="no">{st.no}</span>
                <span>{st.title}</span>
              </li>
            ))}
          </ul>

          {subs.length > 0 && (
            <>
              <h2>最近の提出</h2>
              {subs.map((x, i) => (
                <div key={i} className="card">
                  <div className="row">
                    <span className={`pill ${x.verdict === "pass" ? "ok" : x.verdict === "retry" ? "warn" : ""}`}>
                      {x.verdict === "pass" ? "合格" : x.verdict === "retry" ? "もう一歩" : "確認中"}
                    </span>
                    <span className="muted">Stage {x.stage_no}・{fmtDate(x.created_at)}</span>
                  </div>
                  <p className="pre muted" style={{ marginTop: 6, marginBottom: 0 }}>{x.feedback}</p>
                </div>
              ))}
            </>
          )}

          <h2>月1回の相談会・交流会</h2>
          {events.length ? (
            events.map((e) => (
              <div key={e.id} className="card">
                <h3>{e.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{fmtDate(e.starts_at)}　{e.place}</p>
                {e.url && <p style={{ margin: "4px 0" }}><a href={e.url} target="_blank">{e.url}</a></p>}
                {e.description && <p className="pre">{e.description}</p>}
                <form action={rsvpAction} className="row">
                  <input type="hidden" name="event_id" value={e.id} />
                  <button name="status" value="yes" className={`btn small ${myRsvp.get(Number(e.id)) === "yes" ? "" : "ghost"}`}>参加する</button>
                  <button name="status" value="no" className={`btn small ${myRsvp.get(Number(e.id)) === "no" ? "" : "ghost"}`}>不参加</button>
                </form>
              </div>
            ))
          ) : (
            <p className="muted">次の会は準備中です。決まったら公式LINEでお知らせします。</p>
          )}
        </>
      ) : (
        <>
          <h2>スクール</h2>
          <div className="card soft">
            <p>スクール（90日のカリキュラム・AI審査・月1回の交流会）は、スクールつきのプランで使えます。</p>
            <div className="row">
              <form method="post" action="/api/checkout">
                <input type="hidden" name="plan" value="school_single" />
                <button className="btn">一括で入る（{m.is_student && m.student_status !== "rejected" ? "25,000" : "50,000"}円）</button>
              </form>
              <form method="post" action="/api/checkout">
                <input type="hidden" name="plan" value="school_single" />
                <input type="hidden" name="pay" value="split" />
                <button className="btn ghost">2回に分けて入る（月{m.is_student && m.student_status !== "rejected" ? "12,500" : "25,000"}円×2）</button>
              </form>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>4ヶ月目から月{m.is_student ? "1,990" : "3,980"}円の専門コースに自動で切り替わります（いつでも解約できます）。</p>
          </div>
        </>
      )}

      <h2>お支払い</h2>
      <div className="card">
        <p className="muted">カードの変更・領収書・解約はこちらから。</p>
        <form method="post" action="/api/portal">
          <button className="btn small ghost">お支払いの管理</button>
        </form>
      </div>
    </Shell>
  );
}
