import { NextResponse, after } from "next/server";
import { sql, type Member } from "@/lib/db";
import { getSettings, appUrl, type Settings } from "@/lib/settings";
import { verifyLineSignature, reply, text, texts, getContent, type LineMessage } from "@/lib/line";
import { mentorReply } from "@/lib/ai";
import {
  advanceSetup, chooseTrack, currentSetup, currentStage, fmtDate, hasSchool, statusText, submitWork, TRACK_WORDS, upcomingEvents,
} from "@/lib/camp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { id: string; type: string; text?: string };
};

export async function POST(req: Request) {
  const body = await req.text();
  const s = await getSettings();
  if (!verifyLineSignature(body, req.headers.get("x-line-signature"), s.line_channel_secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const events = (JSON.parse(body).events || []) as LineEvent[];
  // LINEには先に200を返し、AIの処理はその後で行う
  after(async () => {
    for (const ev of events) {
      try {
        await handle(ev, s);
      } catch (e) {
        console.error("LINE event error", e);
        if (ev.replyToken) await reply(s.line_access_token, ev.replyToken, [text("ごめんなさい、うまく処理できませんでした。少し時間をおいて、もう一度送ってください。")]);
      }
    }
  });
  return NextResponse.json({ ok: true });
}

const HELP = `使い方
・導入 … ツールの入れ方を1ステップずつ（終わったら「できた」）
・提出 … 課題を出す（文章・URL・画像OK。最後に「以上」）
・いまの課題 … 今のステージを見る
・交流会 … 月1回のリアル相談会・交流会
・マイページ … ツールの受け取り・進み具合
・スタッフ … 運営の人につなぐ
・それ以外 … なんでもAIに相談できます（24時間）`;

async function handle(ev: LineEvent, s: Settings) {
  const token = s.line_access_token;
  const uid = ev.source?.userId;
  if (!uid || !ev.replyToken || !token) return;
  const rt = ev.replyToken;
  let say = (msgs: LineMessage[]) => reply(token, rt, msgs);

  if (ev.type === "follow") {
    return say([text(`友だち追加ありがとうございます。AI Creator Camp です。

はじめに、マイページに出ている「6けたの連携コード」をこのトークに送ってください。
マイページ：${appUrl()}/me

まだお申し込みでない方はこちら：${appUrl()}/join`)]);
  }
  if (ev.type !== "message" || !ev.message) return;

  const msg = ev.message;
  const t = (msg.text || "").trim().replace(/\s+/g, " ");

  // 連携コード
  const link = t.match(/^(?:連携 ?)?(\d{6})$/);
  if (link) {
    const r = await sql<Member[]>`
      update camp.members set line_user_id = ${uid}
      where line_link_code = ${link[1]} returning *`;
    if (!r.length) return say([text("コードが見つかりませんでした。マイページの6けたのコードを、もう一度確かめてください。")]);
    await sql`update camp.members set line_user_id = null where line_user_id = ${uid} and id <> ${r[0].id}`;
    const m = r[0];
    return say([
      text(`${m.name || ""}さん、連携できました。これからはこのLINEで、ツールの導入も、課題の提出も、相談も全部できます。まずはツールの準備から、1ステップずつ進めます。`),
      text(await statusText(m)),
      text(HELP),
    ]);
  }

  const mrows = await sql<Member[]>`select * from camp.members where line_user_id = ${uid}`;
  const m = mrows[0];
  if (!m) {
    return say([text(`まだ会員情報とつながっていません。
マイページにログインして、出てくる6けたの「連携コード」をここに送ってください。
${appUrl()}/login`)]);
  }
  // 送れずに預かっていた週のお知らせがあれば、この返信の先頭に乗せる（返信は無料）
  if (m.pending_notice) {
    const notice = m.pending_notice;
    await sql`update camp.members set pending_notice = '' where id = ${m.id}`;
    say = (msgs: LineMessage[]) => reply(token, rt, [text(`【今週のお知らせ】\n${notice}`), ...msgs].slice(0, 5));
  }
  if (m.status === "canceled") {
    return say([text(`ご利用が終了しています。再開はこちらから：${appUrl()}/join\nご不明点はメールでお問い合わせください。`)]);
  }

  const st = (await sql<{ mode: string; draft: string; image_ids: string[] }[]>`
    select mode, draft, image_ids from camp.line_state where line_user_id = ${uid}`)[0] || { mode: "", draft: "", image_ids: [] };
  const setMode = (mode: string, draft = "", ids: string[] = []) => sql`
    insert into camp.line_state (line_user_id, mode, draft, image_ids, updated_at) values (${uid}, ${mode}, ${draft}, ${ids}, now())
    on conflict (line_user_id) do update set mode = excluded.mode, draft = excluded.draft, image_ids = excluded.image_ids, updated_at = now()`;
  const log = (role: string, content: string) =>
    sql`insert into camp.messages (member_id, line_user_id, role, content) values (${m.id}, ${uid}, ${role}, ${content})`;

  // ===== 学生証の受付 =====
  if (st.mode === "student_id") {
    if (msg.type === "image") {
      await setMode("");
      await sql`update camp.members set student_status = 'pending' where id = ${m.id}`;
      await sql`insert into camp.tickets (member_id, line_user_id, kind, content, image_id)
        values (${m.id}, ${uid}, 'student_id', '学生証の確認をお願いします', ${msg.id})`;
      return say([text("学生証を受け取りました。運営が確認します。確認できたらこのLINEでお知らせします。")]);
    }
    if (t === "キャンセル") { await setMode(""); return say([text("学生証の受付をやめました。")]); }
    return say([text("学生証の写真を送ってください（やめるときは「キャンセル」）。")]);
  }

  // ===== 提出モード =====
  if (st.mode === "submit") {
    if (t === "キャンセル") { await setMode(""); return say([text("提出をやめました。")]); }
    if (t === "以上" || t === "提出する" || t === "送信") {
      if (!st.draft && !st.image_ids.length) return say([text("まだ何も届いていません。文章・URL・画像を送ってから「以上」と送ってください。")]);
      await setMode("");
      const images = (await Promise.all(st.image_ids.slice(0, 5).map((id) => getContent(token, id)))).filter(
        (x): x is { data: Buffer; type: string } => !!x,
      );
      const res = await submitWork(m, st.draft.trim(), images);
      await log("user", `【提出】${st.draft.trim()}${images.length ? `（画像${images.length}枚）` : ""}`);
      await log("assistant", res.message);
      return say(texts(res.message));
    }
    if (msg.type === "image") {
      await setMode("submit", st.draft, [...st.image_ids, msg.id]);
      return say([text(`画像を受け取りました（${st.image_ids.length + 1}枚目）。続けて送るか、最後に「以上」と送ってください。`)]);
    }
    if (msg.type === "text") {
      await setMode("submit", (st.draft ? st.draft + "\n" : "") + (msg.text || ""), st.image_ids);
      return say([text("受け取りました。続けて送るか、全部送ったら「以上」と送ってください。")]);
    }
    return say([text("文章・URL・画像で送ってください。動画はURL（YouTubeやGoogleドライブなど）でお願いします。")]);
  }

  // ===== コマンド =====
  if (t === "提出" || t === "課題提出" || t === "課題を提出") {
    if (!hasSchool(m)) return say([text(`課題の提出はスクールつきのプランで使えます。\n${appUrl()}/join`)]);
    const stage = await currentStage(m);
    if (!stage) return say([text(await statusText(m))]);
    await setMode("submit");
    return say([text(`Stage ${stage.no}「${stage.title}」の提出を受け付けます。

■ 課題
${stage.task}

文章・URL・画像を、何回かに分けて送ってOKです。
全部送ったら「以上」と送ってください。AIがすぐ審査します。
（やめるときは「キャンセル」）`)]);
  }
  if (["導入", "ツール導入", "ツールの入れ方", "セットアップ"].includes(t)) {
    return say(texts(await statusText(m)));
  }
  if (["できた", "できました", "完了", "OK", "ok"].includes(t)) {
    const setup = await currentSetup(m);
    if (setup) {
      const msgText = await advanceSetup(m);
      await log("user", t);
      await log("assistant", msgText);
      return say(texts(msgText));
    }
    if (hasSchool(m)) return say([text("課題ができたら「提出」と送って、提出物を送ってください。")]);
  }
  if (["いまの課題", "今の課題", "課題", "カリキュラム", "ステージ"].includes(t)) {
    return say(texts(await statusText(m)));
  }
  if (t === "マイページ") {
    return say([text(`マイページ（ツールの受け取り・進み具合・支払い）：\n${appUrl()}/me\nメールアドレスだけでログインできます。`)]);
  }
  if (t === "使い方" || t === "ヘルプ" || t === "メニュー") return say([text(HELP)]);
  if (t === "学生証") {
    if (!m.is_student) return say([text("学生価格でお申し込みのかただけ、学生証の提出が必要です。")]);
    await setMode("student_id");
    return say([text("学生証の写真を送ってください（顔写真・学校名・有効期限が見えるように）。")]);
  }
  if (t === "交流会" || t === "相談会") {
    const evs = await upcomingEvents(3);
    if (!evs.length) return say([text("次の交流会は準備中です。決まったらこのLINEでお知らせします。")]);
    const body = evs
      .map((e) => `■ ${e.title}\n${fmtDate(e.starts_at)}\n${e.place}${e.url ? `\n${e.url}` : ""}${e.description ? `\n${e.description}` : ""}\n参加する→「参加 ${e.id}」`)
      .join("\n\n");
    return say(texts(`月1回のリアル相談会・交流会です。\n\n${body}`));
  }
  const rsvp = t.match(/^(参加|不参加|欠席) ?(\d+)$/);
  if (rsvp) {
    const status = rsvp[1] === "参加" ? "yes" : "no";
    const ev = await sql<{ id: number; title: string; starts_at: Date }[]>`select id, title, starts_at from camp.events where id = ${Number(rsvp[2])}`;
    if (!ev.length) return say([text("その番号の会が見つかりませんでした。「交流会」と送ると一覧が出ます。")]);
    await sql`insert into camp.rsvps (event_id, member_id, status) values (${ev[0].id}, ${m.id}, ${status})
      on conflict (event_id, member_id) do update set status = excluded.status`;
    return say([text(status === "yes" ? `「${ev[0].title}」（${fmtDate(ev[0].starts_at)}）参加で受け付けました。前日にリマインドを送ります。` : "不参加で受け付けました。")]);
  }
  const tr = t.match(/^専門 ?(.+)$/);
  if (tr) {
    const key = TRACK_WORDS[tr[1].trim()];
    return say(texts(await chooseTrack(m, key || "")));
  }
  if (t === "スタッフ" || t.includes("人と話したい") || t.includes("運営に")) {
    await sql`insert into camp.tickets (member_id, line_user_id, kind, content) values (${m.id}, ${uid}, 'human', ${t})`;
    return say([text("運営スタッフに伝えました。順番にお返事します（少しお時間をいただくことがあります）。\nその間も、AIへの相談はいつでもどうぞ。")]);
  }

  // ===== それ以外はAI相談 =====
  let images: { data: Buffer; type: string }[] = [];
  if (msg.type === "image") {
    const c = await getContent(token, msg.id);
    if (c) images = [c];
  } else if (msg.type !== "text") {
    return say([text("文章か画像で送ってください。")]);
  }
  const hist = await sql<{ role: "user" | "assistant"; content: string }[]>`
    select role, content from (
      select role, content, created_at from camp.messages
      where line_user_id = ${uid} and role in ('user','assistant') order by created_at desc limit 12
    ) x order by created_at`;
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const h of hist) {
    const last = merged[merged.length - 1];
    if (last && last.role === h.role) last.content += "\n" + h.content;
    else merged.push({ ...h });
  }
  if (merged.length && merged[merged.length - 1].role === "user") merged.pop();
  const stage = (await currentSetup(m)) || (await currentStage(m));
  const out = await mentorReply(m, stage, merged, msg.text || "", images);
  await log("user", msg.text || "（画像）");
  await log("assistant", out.text);
  if (out.escalate) {
    await sql`insert into camp.tickets (member_id, line_user_id, kind, content) values (${m.id}, ${uid}, 'escalated', ${msg.text || "（画像）"})`;
  }
  return say(texts(out.text));
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "LINE webhook endpoint" });
}

