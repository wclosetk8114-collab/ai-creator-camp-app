"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { sql, type Member, type Stage } from "@/lib/db";
import { isAdmin, setAdminSession, clearAdminSession } from "@/lib/session";
import { appUrl, getSettings, setSetting } from "@/lib/settings";
import { botInfo, multicast, push, setupRichMenu, setWebhook, text } from "@/lib/line";
import { advance, fmtDate } from "@/lib/camp";

async function guard() {
  if (!(await isAdmin())) redirect("/admin-login");
}

export async function adminLogin(fd: FormData) {
  const pw = String(fd.get("password") || "");
  const expect = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(pw), b = Buffer.from(expect);
  if (!expect || a.length !== b.length || !crypto.timingSafeEqual(a, b)) redirect("/admin-login?e=1");
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin-login");
}

// ===== 設定 =====
const SETTING_KEYS = [
  "line_channel_secret", "line_access_token", "line_friend_url",
  "stripe_secret_key", "stripe_webhook_secret",
  "mail_provider", "gas_mail_url", "gas_mail_secret", "resend_api_key", "mail_from",
  "tool_download_url", "tool_guide_url", "admin_email", "ai_model",
  "price_tool", "price_tool_student", "price_school_a", "price_school_a_student",
  "price_school_b", "price_school_b_student", "price_cont", "price_cont_student",
];

export async function saveSettings(fd: FormData) {
  await guard();
  for (const k of SETTING_KEYS) {
    const v = fd.get(k);
    if (v === null) continue;
    const val = String(v).trim();
    // 秘密の値は「空欄のまま保存」で上書きしない
    if (val === "" && fd.get(`${k}__secret`) === "1") continue;
    await setSetting(k, val);
  }
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function connectLine() {
  await guard();
  const s = await getSettings();
  if (!s.line_access_token) redirect("/admin/settings?line=" + encodeURIComponent("先にアクセストークンを保存してください"));
  const info = await botInfo(s.line_access_token);
  if (!info) redirect("/admin/settings?line=" + encodeURIComponent("アクセストークンが正しくないようです"));
  const wh = await setWebhook(s.line_access_token, `${appUrl()}/api/line/webhook`);
  if (info?.basicId && !s.line_friend_url) await setSetting("line_friend_url", `https://line.me/R/ti/p/${info.basicId}`);
  let menu = "";
  try {
    const r = await fetch(`${appUrl()}/richmenu.png`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const img = Buffer.from(await r.arrayBuffer());
    const rm = await setupRichMenu(s.line_access_token, img);
    menu = rm.ok ? "メニューも設定しました" : `メニュー設定に失敗：${rm.detail.slice(0, 120)}`;
  } catch (e) {
    menu = `メニュー画像を読めませんでした：${String(e).slice(0, 80)}`;
  }
  const msg = wh.ok
    ? `「${info?.displayName}」とつながりました。Webhookを設定しました。${menu}`
    : `Webhookの設定に失敗しました：${wh.detail.slice(0, 160)}`;
  redirect("/admin/settings?line=" + encodeURIComponent(msg));
}

// ===== 問い合わせ（チケット） =====
export async function replyTicket(fd: FormData) {
  await guard();
  const id = Number(fd.get("id"));
  const body = String(fd.get("body") || "").trim();
  const close = fd.get("close") === "1";
  const t = (await sql<{ line_user_id: string | null; member_id: string | null }[]>`select line_user_id, member_id from camp.tickets where id = ${id}`)[0];
  if (t && body) {
    const s = await getSettings();
    if (t.line_user_id && s.line_access_token) {
      await push(s.line_access_token, t.line_user_id, [text(`【運営より】\n${body}`)]);
      await sql`insert into camp.messages (member_id, line_user_id, role, content) values (${t.member_id}, ${t.line_user_id}, 'admin', ${body})`;
    }
  }
  if (close || body) await sql`update camp.tickets set status = 'closed' where id = ${id}`;
  revalidatePath("/admin");
}

export async function decideStudent(fd: FormData) {
  await guard();
  const mid = String(fd.get("member_id"));
  const ok = fd.get("decision") === "approve";
  await sql`update camp.members set student_status = ${ok ? "approved" : "rejected"} where id = ${mid}`;
  const tid = Number(fd.get("ticket_id") || 0);
  if (tid) await sql`update camp.tickets set status = 'closed' where id = ${tid}`;
  const m = (await sql<Member[]>`select * from camp.members where id = ${mid}`)[0];
  const s = await getSettings();
  if (m?.line_user_id && s.line_access_token) {
    await push(s.line_access_token, m.line_user_id, [
      text(ok ? "学生証を確認しました。学生価格のまま続けられます。" : "学生証が確認できませんでした。運営からご連絡します。"),
    ]);
  }
  revalidatePath("/admin");
}

// ===== 会員 =====
export async function updateMember(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  await sql`update camp.members set
    name = ${String(fd.get("name") || "")},
    plan = ${String(fd.get("plan"))},
    status = ${String(fd.get("status"))},
    is_student = ${fd.get("is_student") === "1"},
    student_status = ${String(fd.get("student_status"))},
    track = ${String(fd.get("track"))},
    current_stage = ${Number(fd.get("current_stage") || 1)},
    core_completed = ${fd.get("core_completed") === "1"},
    notes = ${String(fd.get("notes") || "")}
    where id = ${id}`;
  revalidatePath(`/admin/members/${id}`);
}

export async function messageMember(fd: FormData) {
  await guard();
  const id = String(fd.get("id"));
  const body = String(fd.get("body") || "").trim();
  const m = (await sql<Member[]>`select * from camp.members where id = ${id}`)[0];
  const s = await getSettings();
  if (m?.line_user_id && body && s.line_access_token) {
    await push(s.line_access_token, m.line_user_id, [text(`【運営より】\n${body}`)]);
    await sql`insert into camp.messages (member_id, line_user_id, role, content) values (${m.id}, ${m.line_user_id}, 'admin', ${body})`;
  }
  revalidatePath(`/admin/members/${id}`);
}

export async function addMember(fd: FormData) {
  await guard();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  if (!email) return;
  const { newLinkCode } = await import("@/lib/camp");
  const code = await newLinkCode();
  await sql`insert into camp.members (email, name, plan, is_student, line_link_code, notes)
    values (${email}, ${String(fd.get("name") || "")}, ${String(fd.get("plan") || "school_a")}, ${fd.get("is_student") === "1"}, ${code}, '手動登録')
    on conflict (email) do nothing`;
  revalidatePath("/admin/members");
}

// ===== 提出の判定をやり直す =====
export async function overrideSubmission(fd: FormData) {
  await guard();
  const id = Number(fd.get("id"));
  const verdict = fd.get("verdict") === "pass" ? "pass" : "retry";
  const note = String(fd.get("note") || "").trim();
  const sub = (await sql<{ member_id: string; track: string; stage_no: number }[]>`
    update camp.submissions set verdict = ${verdict}, by_admin = true,
      feedback = case when ${note} <> '' then ${note} else feedback end
    where id = ${id} returning member_id, track, stage_no`)[0];
  if (!sub) return;
  const m = (await sql<Member[]>`select * from camp.members where id = ${sub.member_id}`)[0];
  const s = await getSettings();
  let msg = "";
  if (verdict === "pass") {
    const st = (await sql<Stage[]>`select * from camp.stages where track = ${sub.track} and no = ${sub.stage_no}`)[0];
    const next = st ? await advance(m, st) : "";
    msg = `【合格】Stage ${sub.stage_no}（運営が確認しました）\n${note}\n\n${next}`;
  } else {
    msg = `【もう一歩】Stage ${sub.stage_no}（運営が確認しました）\n${note}\n\n直したら、もう一度「提出」と送ってください。`;
  }
  if (m?.line_user_id && s.line_access_token) await push(s.line_access_token, m.line_user_id, [text(msg.trim())]);
  revalidatePath("/admin/submissions");
}

// ===== カリキュラム =====
export async function saveStage(fd: FormData) {
  await guard();
  const track = String(fd.get("track") || "core");
  const no = Number(fd.get("no"));
  const vals = {
    month: Number(fd.get("month") || 0),
    title: String(fd.get("title") || ""),
    body: String(fd.get("body") || ""),
    task: String(fd.get("task") || ""),
    rubric: String(fd.get("rubric") || ""),
  };
  await sql`insert into camp.stages (track, no, month, title, body, task, rubric)
    values (${track}, ${no}, ${vals.month}, ${vals.title}, ${vals.body}, ${vals.task}, ${vals.rubric})
    on conflict (track, no) do update set month = excluded.month, title = excluded.title, body = excluded.body, task = excluded.task, rubric = excluded.rubric`;
  revalidatePath("/admin/curriculum");
  redirect(`/admin/curriculum?track=${track}&saved=${no}`);
}

export async function deleteStage(fd: FormData) {
  await guard();
  const track = String(fd.get("track"));
  await sql`delete from camp.stages where track = ${track} and no = ${Number(fd.get("no"))}`;
  redirect(`/admin/curriculum?track=${track}`);
}

// ===== 交流会 =====
export async function createEvent(fd: FormData) {
  await guard();
  const local = String(fd.get("starts_at") || "");
  const startsAt = new Date(`${local}:00+09:00`);
  const r = await sql<{ id: number }[]>`insert into camp.events (title, starts_at, place, url, description)
    values (${String(fd.get("title") || "")}, ${startsAt}, ${String(fd.get("place") || "")}, ${String(fd.get("url") || "")}, ${String(fd.get("description") || "")})
    returning id`;
  if (fd.get("notify") === "1") {
    const s = await getSettings();
    const ids = (await sql<{ line_user_id: string }[]>`
      select line_user_id from camp.members where line_user_id is not null and status <> 'canceled' and plan <> 'tool'`).map((x) => x.line_user_id);
    if (ids.length && s.line_access_token) {
      await multicast(s.line_access_token, ids, [
        text(`【お知らせ】${String(fd.get("title"))}\n${fmtDate(startsAt)}\n${String(fd.get("place") || "")}\n${String(fd.get("description") || "")}\n\n参加する→「参加 ${r[0].id}」と送ってください。`),
      ]);
    }
  }
  revalidatePath("/admin/events");
}

export async function deleteEvent(fd: FormData) {
  await guard();
  await sql`delete from camp.events where id = ${Number(fd.get("id"))}`;
  revalidatePath("/admin/events");
}

export async function broadcast(fd: FormData) {
  await guard();
  const body = String(fd.get("body") || "").trim();
  const target = String(fd.get("target") || "school");
  if (!body) return;
  const s = await getSettings();
  const rows = target === "all"
    ? await sql<{ line_user_id: string }[]>`select line_user_id from camp.members where line_user_id is not null and status <> 'canceled'`
    : await sql<{ line_user_id: string }[]>`select line_user_id from camp.members where line_user_id is not null and status <> 'canceled' and plan <> 'tool'`;
  if (rows.length && s.line_access_token) await multicast(s.line_access_token, rows.map((r) => r.line_user_id), [text(body)]);
  redirect(`/admin?sent=${rows.length}`);
}
