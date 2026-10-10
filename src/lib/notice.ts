import { sql, type Member } from "./db";
import { getSettings, type Settings } from "./settings";
import { push, quotaLeft, texts } from "./line";
import { hasSchool, statusText } from "./camp";
import { sendMail } from "./mail";
import { rewriteNotice } from "./ai";
import { setSetting } from "./settings";
import { appUrl } from "./settings";

// 週の告知：月（今週の課題）・金（途中チェック）・土（提出）。
// LINE無料プランは「こちらから送る」通数に上限があるので、
// 残りがあるうちは送り、足りなくなったら「次にその人が話しかけてきたときの返信」に乗せる（返信は無料）。

export type NoticeDay = "mon" | "fri" | "sat";

export function noticeDayJST(now = new Date()): NoticeDay | null {
  const wd = new Date(now.getTime() + 9 * 3600 * 1000).getUTCDay(); // 0=日
  return wd === 1 ? "mon" : wd === 5 ? "fri" : wd === 6 ? "sat" : null;
}

export async function buildNotice(m: Member, day: NoticeDay, s: Settings, override?: string): Promise<string> {
  const tpl = override || s[`notice_${day}`] || "";
  const stage = tpl.includes("{stage}") ? await statusText(m) : "";
  return tpl.replaceAll("{name}", m.name || "").replaceAll("{stage}", stage).trim();
}

const SUBJECT: Record<NoticeDay, string> = {
  mon: "📮【AI Creator Camp】今週の課題が届きました",
  fri: "👀【AI Creator Camp】今週の進みぐあいはどう？",
  sat: "📮【AI Creator Camp】週末は提出の日です",
};

export async function runWeeklyNotice(day: NoticeDay, opts: { force?: boolean } = {}) {
  const s = await getSettings();
  if (s.notice_enabled !== "1" && !opts.force) return { skipped: "disabled" };
  const useMail = s.notice_email !== "0" && day === "mon"; // メールは月曜（今週の課題）だけ
  if (!s.line_access_token && !useMail) return { skipped: "line not configured" };
  const members = (await sql<Member[]>`
    select * from camp.members where status <> 'canceled' and plan <> 'tool'`).filter(hasSchool);
  const linked = members.filter((m) => m.line_user_id && s.line_access_token);
  const keep = Number(s.notice_keep || 20);
  let left = !s.line_access_token || s.notice_mode === "reply" ? 0 : Math.max(0, ((await quotaLeft(s.line_access_token)) ?? 0) - keep);
  let pushed = 0, queued = 0, mailed = 0;
  // 毎回ちがう言い回しにする（AIが1回だけ書きかえて、全員に同じ文を使う。失敗したら元の文）
  let tpl: string | undefined;
  if (s.notice_vary !== "0" && s[`notice_${day}`]) {
    tpl = (await rewriteNotice(day, s[`notice_${day}`], s[`notice_last_${day}`] || "")) || undefined;
    if (tpl) await setSetting(`notice_last_${day}`, tpl);
  }
  for (const m of members) {
    const body = await buildNotice(m, day, s, tpl);
    if (!body) continue;
    if (useMail && m.email) {
      const footer = `\n\n――――――\n提出や相談は公式LINEからどうぞ📱${m.line_user_id ? "" : `\nまだLINEとつないでいない場合は、マイページの手順でつないでね👇`}\nマイページ：${appUrl()}/me\n\nAI Creator Camp`;
      if (await sendMail(m.email, SUBJECT[day], body + footer)) mailed++;
    }
    if (!linked.includes(m)) continue;
    if (left > 0) {
      const ok = await push(s.line_access_token, m.line_user_id!, texts(body).slice(0, 2));
      if (ok) { pushed++; left--; await sql`update camp.members set pending_notice = '' where id = ${m.id}`; continue; }
    }
    // 送れない分は、次にその人から話しかけられたときの返信の先頭に乗せる（古いお知らせは上書き）
    await sql`update camp.members set pending_notice = ${body} where id = ${m.id}`;
    queued++;
  }
  return { day, targets: linked.length, pushed, queued, mailed };
}
