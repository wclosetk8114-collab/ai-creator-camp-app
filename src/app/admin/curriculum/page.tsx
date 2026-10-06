import Link from "next/link";
import { listStages } from "@/lib/camp";
import { TRACKS } from "@/lib/settings";
import { deleteStage, saveStage } from "../actions";

export const dynamic = "force-dynamic";

const ALL: Record<string, string> = { core: "基礎（90日）", ...TRACKS };

export default async function Curriculum({ searchParams }: { searchParams: Promise<{ track?: string; saved?: string }> }) {
  const sp = await searchParams;
  const track = ALL[sp.track || ""] ? sp.track! : "core";
  const stages = await listStages(track);
  const nextNo = (stages[stages.length - 1]?.no || 0) + 1;
  return (
    <>
      <h1>カリキュラム</h1>
      <p className="muted">「課題」と「合格基準」をもとにAIが審査します。合格基準は具体的に書くほど、審査がぶれません。</p>
      <div className="row" style={{ marginBottom: 12 }}>
        {Object.entries(ALL).map(([k, v]) => (
          <Link key={k} href={`/admin/curriculum?track=${k}`} className={`btn small ${k === track ? "" : "ghost"}`}>{v}</Link>
        ))}
      </div>
      {sp.saved && <div className="okbox">Stage {sp.saved} を保存しました</div>}
      {[...stages, { id: 0, track, no: nextNo, month: track === "core" ? 3 : 0, title: "", body: "", task: "", rubric: "" }].map((s) => (
        <details key={`${s.track}-${s.no}`} className="card" open={s.id === 0 ? false : undefined}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {s.id === 0 ? "＋ ステージを追加" : `Stage ${s.no}${s.month ? `（Month${s.month}）` : ""}　${s.title}`}
          </summary>
          <form action={saveStage} style={{ marginTop: 10 }}>
            <input type="hidden" name="track" value={track} />
            <div className="grid2">
              <div><label>番号</label><input type="number" name="no" defaultValue={s.no} min={1} /></div>
              <div><label>Month（基礎のみ・1〜3）</label><input type="number" name="month" defaultValue={s.month} min={0} max={3} /></div>
            </div>
            <label>タイトル</label><input type="text" name="title" defaultValue={s.title} required />
            <label>説明（受講生に見せる）</label><textarea name="body" defaultValue={s.body} style={{ minHeight: 90 }} />
            <label>課題（何を提出するか）</label><textarea name="task" defaultValue={s.task} style={{ minHeight: 90 }} />
            <label>合格基準（AIの審査に使う。受講生には見せない）</label><textarea name="rubric" defaultValue={s.rubric} style={{ minHeight: 90 }} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn small">保存</button>
            </div>
          </form>
          {s.id !== 0 && (
            <form action={deleteStage} style={{ marginTop: 6 }}>
              <input type="hidden" name="track" value={track} />
              <input type="hidden" name="no" value={s.no} />
              <button className="btn small ghost">このステージを削除</button>
            </form>
          )}
        </details>
      ))}
    </>
  );
}
