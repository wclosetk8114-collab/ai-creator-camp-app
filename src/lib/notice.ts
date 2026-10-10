import { sql, type Member } from "./db";
import { getSettings, type Settings } from "./settings";
import { push, quotaLeft, texts } from "./line";
import { hasSchool, statusText } from "./camp";

// 週の告知：月（今週の課題）・金（途中チェック）・土（提出）。
// LINE無料プランは「こちらから送る」通数に上限があるので、
// 残りがあるうちは送り、足りなくなったら「次にその人が話しかけてきたときの返信」に乗せる（返信は無料）。

export type NoticeDay = "mon" | "fri" | "sat";

export function noticeDayJST(now = new Date()): NoticeDay | null {
  const wd = new Date(now.getTime() + 9 * 3600 * 1000).getUTCDay(); // 0=日
  return wd === 1 ? "mon" : wd === 5 ? "fri" : wd === 6 ? "sat" : null;
}

export async function buildNotice(m: Member, day: NoticeDay, s: Settings): Promise<string> {
  const tpl = s[`notice_${day}`] || "";
  const stage = tpl.includes("{stage}") ? await statusText(m) : "";
  return tpl.replaceAll("{name}", m.name || "").replaceAll("{stage}", stage).trim();
}

export async function runWeeklyNotice(day: NoticeDay, opts: { force?: boolean } = {}) {
  const s = await getSettings();
  if (!s.line_access_token) return { skipped: "line not configured" };
  if (s.notice_enabled !== "1" && !opts.force) return { skipped: "disabled" };
  const members = await sql<Member[]>`
    select * from camp.members where line_user_id is not null and status <> 'canceled' and plan <> 'tool'`;
  const targets = members.filter(hasSchool);
  const keep = Number(s.notice_keep || 20);
  let left = s.notice_mode === "reply" ? 0 : Math.max(0, ((await quotaLeft(s.line_access_token)) ?? 0) - keep);
  let pushed = 0, queued = 0;
  for (const m of targets) {
    const body = await buildNotice(m, day, s);
    if (!body) continue;
    if (left > 0) {
      const ok = await push(s.line_access_token, m.line_user_id!, texts(body).slice(0, 2));
      if (ok) { pushed++; left--; await sql`update camp.members set pending_notice = '' where id = ${m.id}`; continue; }
    }
    // 送れない分は、次にその人から話しかけられたときの返信の先頭に乗せる（古いお知らせは上書き）
    await sql`update camp.members set pending_notice = ${body} where id = ${m.id}`;
    queued++;
  }
  return { day, targets: targets.length, pushed, queued };
}
