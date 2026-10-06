import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { multicast, text } from "@/lib/line";
import { fmtDate } from "@/lib/camp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 毎朝9時（日本時間）：翌日〜36時間以内の交流会を、参加予定の人＋未回答の会員にリマインド
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const s = await getSettings();
  if (!s.line_access_token) return NextResponse.json({ ok: true, skipped: "line not configured" });
  const evs = await sql<{ id: number; title: string; starts_at: Date; place: string; url: string }[]>`
    select id, title, starts_at, place, url from camp.events
    where reminded = false and starts_at between now() and now() + interval '36 hours'`;
  let sent = 0;
  for (const e of evs) {
    const to = await sql<{ line_user_id: string }[]>`
      select m.line_user_id from camp.members m
      left join camp.rsvps r on r.member_id = m.id and r.event_id = ${e.id}
      where m.line_user_id is not null and m.status <> 'canceled' and m.plan <> 'tool' and coalesce(r.status, 'yes') = 'yes'`;
    const ids = to.map((x) => x.line_user_id);
    if (ids.length) {
      await multicast(s.line_access_token, ids, [
        text(`【リマインド】${e.title}\n${fmtDate(e.starts_at)}\n${e.place}${e.url ? `\n${e.url}` : ""}\n\n参加できない場合は「不参加 ${e.id}」と送ってください。`),
      ]);
      sent += ids.length;
    }
    await sql`update camp.events set reminded = true where id = ${e.id}`;
  }
  return NextResponse.json({ ok: true, events: evs.length, sent });
}
