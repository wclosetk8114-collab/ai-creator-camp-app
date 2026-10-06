import { sql } from "@/lib/db";
import { fmtDate } from "@/lib/camp";
import { createEvent, deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function Events() {
  const evs = await sql<{ id: number; title: string; starts_at: Date; place: string; url: string; description: string; yes: number; no: number }[]>`
    select e.*, count(r.*) filter (where r.status = 'yes')::int as yes, count(r.*) filter (where r.status = 'no')::int as no
    from camp.events e left join camp.rsvps r on r.event_id = e.id
    group by e.id order by e.starts_at desc limit 30`;
  return (
    <>
      <h1>交流会（月1回のリアル相談会）</h1>
      <form action={createEvent} className="card">
        <h3>新しく作る</h3>
        <label>タイトル</label><input type="text" name="title" required defaultValue="月1回の相談会・交流会" />
        <div className="grid2">
          <div><label>日時</label><input type="datetime-local" name="starts_at" required /></div>
          <div><label>場所</label><input type="text" name="place" placeholder="名古屋駅近く ○○（または オンライン）" /></div>
        </div>
        <label>URL（地図・Zoomなど）</label><input type="text" name="url" />
        <label>説明</label><textarea name="description" style={{ minHeight: 70 }} placeholder="持ち物、当日の流れなど" />
        <label className="check"><input type="checkbox" name="notify" value="1" defaultChecked /> スクールの全員にLINEで知らせる</label>
        <button className="btn small" style={{ marginTop: 8 }}>作成</button>
        <p className="muted" style={{ margin: "6px 0 0" }}>前日の朝9時に、参加予定の人へ自動でリマインドが届きます。</p>
      </form>
      {evs.map((e) => (
        <div key={e.id} className="card">
          <div className="row"><span className="pill">#{e.id}</span><h3 style={{ margin: 0 }}>{e.title}</h3></div>
          <p className="muted" style={{ margin: "4px 0" }}>{fmtDate(e.starts_at)}　{e.place}　参加 {e.yes}／不参加 {e.no}</p>
          {e.description && <p className="pre">{e.description}</p>}
          <form action={deleteEvent}><input type="hidden" name="id" value={e.id} /><button className="btn small ghost">削除</button></form>
        </div>
      ))}
    </>
  );
}
