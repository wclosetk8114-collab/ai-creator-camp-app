import { sql, type Member, type Stage } from "./db";
import { gradeSubmission, type Grade } from "./ai";
import { appUrl, TRACKS } from "./settings";

export function hasSchool(m: Member) {
  return m.plan !== "tool" && m.status !== "canceled";
}

export async function getStage(track: string, no: number): Promise<Stage | null> {
  const r = await sql<Stage[]>`select * from camp.stages where track = ${track} and no = ${no}`;
  return r[0] ?? null;
}

export async function stageCount(track: string): Promise<number> {
  const r = await sql<{ n: number }[]>`select count(*)::int as n from camp.stages where track = ${track}`;
  return r[0]?.n ?? 0;
}

export async function listStages(track: string): Promise<Stage[]> {
  return sql<Stage[]>`select * from camp.stages where track = ${track} order by no`;
}

/** いま取り組むステージ（無ければ null：基礎修了で専門未選択、または専門を最後まで終えた） */
export async function currentStage(m: Member): Promise<Stage | null> {
  if (!hasSchool(m)) return null;
  return getStage(m.track, m.current_stage);
}

export function stageText(s: Stage, m?: Member) {
  const head = s.track === "core" ? `Month${s.month}・Stage ${s.no}` : `${TRACKS[s.track] || s.track}・Stage ${s.no}`;
  return `【${head}】${s.title}

${s.body}

■ 課題
${s.task}

できたら「提出」と送ってください。${m ? "" : ""}`;
}

export async function statusText(m: Member): Promise<string> {
  if (!hasSchool(m)) {
    return `いまのプランは「ツールのみ」です。ツールの使い方は、なんでもこのLINEで聞いてください。
マイページ：${appUrl()}/me`;
  }
  const s = await currentStage(m);
  if (s) return stageText(s, m);
  if (m.track === "core" && m.core_completed) {
    return `基礎の90日は修了しています。おつかれさまでした。
次は専門コースを選んでください。送る言葉：
・専門 動画
・専門 アプリ
・専門 自動化
・専門 アート`;
  }
  return `「${TRACKS[m.track] || m.track}」の課題はすべて合格しています。
別の専門に進むなら「専門 動画／アプリ／自動化／アート」と送ってください。`;
}

export const TRACK_WORDS: Record<string, string> = {
  動画: "video", 画像: "video", アプリ: "app", ツール: "app", 開発: "app",
  自動化: "dx", DX: "dx", dx: "dx", アート: "art", ゲーム: "art", 漫画: "art", マンガ: "art",
};

export async function chooseTrack(m: Member, track: string): Promise<string> {
  if (!hasSchool(m)) return "専門コースはスクールつきのプランで使えます。";
  if (!m.core_completed) return "専門コースは、基礎の12ステージを修了すると選べます。いまの課題を進めましょう。";
  if (!TRACKS[track]) return "選べるのは「動画／アプリ／自動化／アート」の4つです。";
  await sql`update camp.members set track = ${track}, current_stage = 1 where id = ${m.id}`;
  const s = await getStage(track, 1);
  return `専門「${TRACKS[track]}」に進みました。\n\n` + (s ? stageText(s) : "課題を準備中です。");
}

/** 提出を審査して、合格なら次へ進める。受講生に送る文を返す */
export async function submitWork(
  m: Member,
  content: string,
  images: { data: Buffer; type: string }[],
): Promise<{ message: string; grade: Grade | null }> {
  if (!hasSchool(m)) return { message: "課題の提出はスクールつきのプランで使えます。", grade: null };
  const stage = await currentStage(m);
  if (!stage) return { message: await statusText(m), grade: null };

  const grade = await gradeSubmission(stage, content, images);
  await sql`
    insert into camp.submissions (member_id, track, stage_no, content, has_image, verdict, feedback, score)
    values (${m.id}, ${stage.track}, ${stage.no}, ${content}, ${images.length > 0}, ${grade.verdict}, ${grade.feedback}, ${grade.score})`;

  if (grade.verdict === "pending") {
    await sql`insert into camp.tickets (member_id, line_user_id, kind, content)
      values (${m.id}, ${m.line_user_id}, 'review', ${`Stage ${stage.track}-${stage.no} の自動審査に失敗。管理画面の提出一覧で判定してください。`})`;
    return { message: grade.feedback, grade };
  }
  if (grade.verdict === "retry") {
    return { message: `【もう一歩】Stage ${stage.no}「${stage.title}」\n\n${grade.feedback}\n\n直したら、もう一度「提出」と送ってください。`, grade };
  }
  const next = await advance(m, stage);
  return { message: `【合格】Stage ${stage.no}「${stage.title}」\n\n${grade.feedback}\n\n${next}`, grade };
}

/** 合格処理：次のステージへ。次に送る文を返す */
export async function advance(m: Member, stage: Stage): Promise<string> {
  if (stage.no !== m.current_stage || stage.track !== m.track) return "";
  const total = await stageCount(stage.track);
  const nextNo = stage.no + 1;
  if (stage.track === "core" && nextNo > total) {
    await sql`update camp.members set current_stage = ${nextNo}, core_completed = true where id = ${m.id}`;
    return `基礎の90日、修了です。ほんとうにおつかれさまでした。
次は専門コースを選んでください。送る言葉：
・専門 動画
・専門 アプリ
・専門 自動化
・専門 アート`;
  }
  await sql`update camp.members set current_stage = ${nextNo} where id = ${m.id}`;
  if (nextNo > total) return `「${TRACKS[stage.track] || stage.track}」の課題はすべて合格です。別の専門にも進めます（「専門 動画」など）。`;
  const ns = await getStage(stage.track, nextNo);
  return ns ? "次のステージです。\n\n" + stageText(ns) : "";
}

export async function upcomingEvents(limit = 3) {
  return sql<{ id: number; title: string; starts_at: Date; place: string; url: string; description: string }[]>`
    select id, title, starts_at, place, url, description from camp.events
    where starts_at > now() - interval '3 hours' order by starts_at limit ${limit}`;
}

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export async function newLinkCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const r = await sql`select 1 from camp.members where line_link_code = ${code}`;
    if (!r.length) return code;
  }
  throw new Error("could not create link code");
}
