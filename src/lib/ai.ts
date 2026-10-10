import Anthropic from "@anthropic-ai/sdk";
import type { Member, Stage } from "./db";
import { getSettings, TRACKS } from "./settings";

const FALLBACK_MODELS = ["claude-sonnet-4-5", "claude-haiku-4-5"];

type ImageInput = { data: Buffer; type: string };
type Content = Anthropic.Messages.ContentBlockParam[];

async function ask(system: string, content: Content, history: Anthropic.Messages.MessageParam[] = [], maxTokens = 1200) {
  const s = await getSettings();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const models = [s.ai_model, ...FALLBACK_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastErr: unknown;
  for (const model of models) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [...history, { role: "user", content }],
      });
      return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    } catch (e) {
      lastErr = e;
      console.error("AI call failed for", model, e);
    }
  }
  throw lastErr;
}

function imageBlocks(images: ImageInput[]): Content {
  const ok = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return images
    .filter((i) => ok.includes(i.type))
    .slice(0, 5)
    .map((i) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: i.type as "image/jpeg", data: i.data.toString("base64") },
    }));
}

export type Grade = { verdict: "pass" | "retry" | "pending"; feedback: string; score: number | null };

export async function gradeSubmission(stage: Stage, contentText: string, images: ImageInput[]): Promise<Grade> {
  const system = `あなたは「AI Creator Camp」の課題審査担当です。受講生の提出物を、ステージの合格基準に照らして判定します。
- 判定は「pass（合格）」か「retry（やり直し）」の2つだけ。
- 基準の中心となる要件が満たされていれば合格。細かい完成度は求めない。ただし基準にある「証拠」（URL・画像・数字など）が無いものは合格にしない。
- URLの中身は開けないので、URLがあること＋説明が基準に合っていれば、URLの先は存在するものとして扱う。
- フィードバックは、やさしく短い日本語で。合格なら「良かった点1つ＋次に活かせるひとこと」、やり直しなら「足りないものを具体的に（箇条書き2〜3個まで）」。専門用語は使わない。3〜6行。
- 出力は次のJSONだけ。前後に何も書かない。
{"verdict":"pass または retry","score":0〜100の整数,"feedback":"受講生に送る文"}`;
  const prompt = `【ステージ】${stage.no}「${stage.title}」
【課題】
${stage.task}
【合格基準】
${stage.rubric}

【受講生の提出（文章）】
${contentText || "（文章なし）"}
【添付画像】${images.length}枚`;
  try {
    const out = await ask(system, [...imageBlocks(images), { type: "text", text: prompt }], [], 800);
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no json");
    const j = JSON.parse(m[0]) as { verdict: string; score?: number; feedback?: string };
    const verdict = j.verdict === "pass" ? "pass" : "retry";
    return { verdict, feedback: String(j.feedback || "").trim(), score: typeof j.score === "number" ? j.score : null };
  } catch (e) {
    console.error("grade failed", e);
    return { verdict: "pending", feedback: "審査がうまくいきませんでした。運営が確認して、あとでお返事します。", score: null };
  }
}

export async function mentorReply(
  member: Member,
  stage: Stage | null,
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
  images: ImageInput[] = [],
): Promise<{ text: string; escalate: boolean }> {
  const hasSchool = member.plan !== "tool";
  const trackName = member.track === "core" ? "基礎（90日）" : TRACKS[member.track] || member.track;
  const system = `あなたは「AI Creator Camp」の相談役AIです。LINEで受講生の相談にのります。運営スタッフがいない時間も、あなたが一次対応します。
【このキャンプ】AIを使って、事業をつくり、稼げる人になる90日のスクール。ツール（Claudeに差し込むプラグイン一式＋手順書）で、動画・画像・ナレーション・LP・アプリ・資料を話しかけるだけで作れる。90日・12ステージ。Month1＝AIでなんでも作れるようになる（Webページ・文章と資料・画像動画声・アプリ）、Month2＝自分のビジネスと要るものをそろえる（事業を決める・サービス設計・ブランド・仕事に使うアプリ）、Month3＝売れる形にして世に出す（LPと申込の入口・7日間発信・最初のお客さん・90日の発表）。課題を提出して合格すると次のステージに進む。1週間の流れは、月に課題が届く→火〜木に手を動かす→金に途中を見せる→土日に提出。月1回リアルの相談会・交流会がある。修了後は月3,980円の専門コース（動画・画像／アプリ・ツール開発／業務自動化・DX／ゲーム・漫画・アート）。
【相手】${member.name || "受講生"}さん／プラン：${hasSchool ? "スクールつき" : "ツールのみ"}／コース：${trackName}${
    stage ? `／いまのステージ：${stage.no}「${stage.title}」 課題：${stage.task}` : ""
  }${stage?.track === "setup" ? "（いまはツールの導入中。スクショが来たら、画面のどこを押すかを具体的に教える。終わったら『できた』と送るよう伝える）" : ""}
【話し方】
- やさしい日本語。短く。LINEなので3〜8行。箇条書きは3つまで。専門用語は言いかえる。
- 具体的な次の一手を1つ示す。Claudeにそのまま貼れる指示文の例を出すと親切。
- 課題の答えを丸ごと代わりに作らない。考え方と手順でサポートする。
- 収入や成果の保証はしない。
- ツールのみのプランの人には、ツールの使い方の相談にのる。スクールの課題の話になったら、スクールつきプランがあることを一言だけ伝える。
- 使えるコマンド：「導入」（ツールの入れ方）「できた」（導入を次へ）「提出」（課題を出す）「いまの課題」「交流会」「マイページ」「スタッフ」（人につなぐ）。
【人につなぐとき】返金・解約・支払い・クレーム・体調や心の深刻な悩み・規約の判断・あなたが答えられないこと、または本人が人と話したいと言ったときは、「運営スタッフに伝えます」と書いて、最後の行に [ESCALATE] とだけ書く。`;
  const hist = history.slice(-10).map((h) => ({ role: h.role, content: h.content })) as Anthropic.Messages.MessageParam[];
  // 履歴は user から始まる必要がある
  while (hist.length && hist[0].role !== "user") hist.shift();
  const out = await ask(system, [...imageBlocks(images), { type: "text", text: message || "（画像のみ）" }], hist, 900);
  const escalate = out.includes("[ESCALATE]");
  return { text: out.replace("[ESCALATE]", "").trim(), escalate };
}
