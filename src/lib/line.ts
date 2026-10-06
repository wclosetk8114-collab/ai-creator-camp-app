import crypto from "crypto";

export type LineMessage = Record<string, unknown>;

export function verifyLineSignature(body: string, signature: string | null, channelSecret: string) {
  if (!signature || !channelSecret) return false;
  const expect = crypto.createHmac("sha256", channelSecret).update(body).digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expect);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function text(t: string): LineMessage {
  return { type: "text", text: t.length > 4900 ? t.slice(0, 4890) + "…" : t };
}

// LINEの1吹き出しは5000字まで。長文は分けて最大5通。
export function texts(t: string): LineMessage[] {
  const out: LineMessage[] = [];
  let rest = t;
  while (rest.length && out.length < 5) {
    out.push({ type: "text", text: rest.slice(0, 4800) });
    rest = rest.slice(4800);
  }
  return out;
}

async function call(token: string, path: string, payload: unknown) {
  const r = await fetch(`https://api.line.me/v2/bot/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) console.error("LINE API error", path, r.status, await r.text());
  return r.ok;
}

export function reply(token: string, replyToken: string, messages: LineMessage[]) {
  return call(token, "message/reply", { replyToken, messages: messages.slice(0, 5) });
}

export function push(token: string, to: string, messages: LineMessage[]) {
  return call(token, "message/push", { to, messages: messages.slice(0, 5) });
}

export async function multicast(token: string, to: string[], messages: LineMessage[]) {
  for (let i = 0; i < to.length; i += 500) {
    await call(token, "message/multicast", { to: to.slice(i, i + 500), messages: messages.slice(0, 5) });
  }
}

export async function getContent(token: string, messageId: string): Promise<{ data: Buffer; type: string } | null> {
  const r = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return { data: Buffer.from(await r.arrayBuffer()), type: r.headers.get("content-type") || "image/jpeg" };
}

export async function setWebhook(token: string, endpoint: string) {
  const r = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  return { ok: r.ok, detail: r.ok ? "" : await r.text() };
}

export async function botInfo(token: string): Promise<{ basicId?: string; displayName?: string } | null> {
  const r = await fetch("https://api.line.me/v2/bot/info", { headers: { Authorization: `Bearer ${token}` } });
  return r.ok ? r.json() : null;
}

// リッチメニュー（画面下のボタン6つ）を作って全員に設定する
export async function setupRichMenu(token: string, image: Buffer) {
  const W = 2500, H = 1686, cw = Math.floor(W / 3), ch = H / 2;
  const labels = ["提出", "いまの課題", "交流会", "マイページ", "使い方", "スタッフ"];
  const areas = labels.map((t, i) => ({
    bounds: { x: (i % 3) * cw, y: Math.floor(i / 3) * ch, width: i % 3 === 2 ? W - 2 * cw : cw, height: ch },
    action: { type: "message", text: t },
  }));
  const create = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ size: { width: W, height: H }, selected: true, name: "camp-main", chatBarText: "メニュー", areas }),
  });
  if (!create.ok) return { ok: false, detail: await create.text() };
  const { richMenuId } = (await create.json()) as { richMenuId: string };
  const up = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
    body: new Uint8Array(image),
  });
  if (!up.ok) return { ok: false, detail: await up.text() };
  const def = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: def.ok, detail: def.ok ? richMenuId : await def.text() };
}
