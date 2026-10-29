import { redirect } from "next/navigation";
import Link from "next/link";
import Shell from "../../Shell";
import { getMember } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { listStages, stageCount } from "@/lib/camp";
import { setupDoneAction, setupBackAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ToolPage() {
  const m = await getMember();
  if (!m) redirect("/login");
  const s = await getSettings();
  const steps = await listStages("setup");
  const total = await stageCount("setup");
  const cur = m.setup_step;
  const done = Math.min(cur - 1, total);
  const finished = cur > total;

  return (
    <Shell right={<Link className="btn small ghost" href="/me">マイページ</Link>}>
      <h1>ツールの受け取りと導入</h1>
      <p className="muted">Claudeに差し込むプラグイン一式です。上から順に、1つずつ進めてください。</p>

      <div className="progress"><div style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      <p className="muted" style={{ marginTop: 6 }}>{done} / {total} ステップ{finished ? "（完了）" : ""}</p>

      <div className="card grad-border" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>ツール一式をダウンロード</h3>
        <p className="muted">プラグイン一式と、設定の手順書です。何度でもダウンロードできます。</p>
        <div className="row">
          {s.tool_download_url
            ? <a className="btn" href={s.tool_download_url} target="_blank" rel="noopener">ツール一式をダウンロード</a>
            : <span className="muted">ただいま準備中です</span>}
          {s.tool_guide_url && <a className="btn ghost" href={s.tool_guide_url} target="_blank" rel="noopener">手順書を開く</a>}
        </div>
      </div>

      {s.tool_openchat_url && (
        <div className="card soft" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>オープンチャット</h3>
          <p className="muted" style={{ marginBottom: 10 }}>新しいツールの配布と、AIの最新情報はここで流しています。入っておくと取りこぼしません。</p>
          <a className="btn small ghost" href={s.tool_openchat_url} target="_blank" rel="noopener">オープンチャットに入る</a>
        </div>
      )}

      {finished && <div className="okbox" style={{ marginTop: 16 }}>導入は完了しています🎉 使い方で困ったら、公式LINEでいつでも聞いてください。</div>}

      <h2>導入の手順</h2>
      {steps.map((st) => {
        const state = st.no < cur ? "done" : st.no === cur ? "now" : "yet";
        return (
          <div key={st.no} className={state === "now" ? "card grad-border" : "card"} style={{ marginBottom: 12, opacity: state === "yet" ? 0.55 : 1 }}>
            <div className="row" style={{ alignItems: "center", gap: 8 }}>
              <span className={state === "done" ? "pill ok" : "pill"}>{state === "done" ? "✓ 完了" : `STEP ${st.no}`}</span>
              <h3 style={{ margin: 0 }}>{st.title}</h3>
            </div>
            {state !== "yet" && <p style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}>{st.body}</p>}
            {state === "now" && (
              <form action={setupDoneAction}>
                <button className="btn small">できた → 次へ</button>
              </form>
            )}
          </div>
        );
      })}

      {cur > 1 && (
        <form action={setupBackAction} style={{ marginTop: 4 }}>
          <button className="btn small ghost">1つ戻す</button>
        </form>
      )}

      <div className="card soft" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>詰まったら</h3>
        <p className="muted" style={{ margin: 0 }}>
          公式LINEに、止まっている画面のスクショをそのまま送ってください。次に押す場所をお伝えします。
          {s.line_friend_url && <> → <a href={s.line_friend_url}>公式LINEを開く</a></>}
        </p>
      </div>
    </Shell>
  );
}
