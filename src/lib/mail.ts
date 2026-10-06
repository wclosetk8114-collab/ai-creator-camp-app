import { getSettings } from "./settings";

// メール送信。Resend（APIキー）か、Google Apps Script の中継（無料・Gmailから送信）のどちらか。
export async function sendMail(to: string, subject: string, body: string): Promise<boolean> {
  return (await sendMailDetail(to, subject, body)).ok;
}

/** 送信結果と、うまくいかなかったときの理由（管理画面のテスト送信用） */
export async function sendMailDetail(to: string, subject: string, body: string): Promise<{ ok: boolean; detail: string }> {
  const s = await getSettings();
  try {
    if (s.mail_provider === "resend" && s.resend_api_key) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${s.resend_api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: s.mail_from, to: [to], subject, text: body }),
      });
      return { ok: r.ok, detail: r.ok ? "" : `Resend ${r.status}: ${(await r.text()).slice(0, 150)}` };
    }
    if (s.gas_mail_url) {
      const r = await fetch(s.gas_mail_url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ secret: s.gas_mail_secret, to, subject, body }),
        redirect: "follow",
      });
      const t = (await r.text()).trim();
      if (r.ok && t === "ok") return { ok: true, detail: "" };
      let why = "Apps Script からの返事がちがいます。";
      if (t === "ng") why = "合言葉が一致していません（スクリプトの SECRET と、設定③の合言葉をそろえてください）。";
      else if (/<html|<!DOCTYPE/i.test(t)) why = "ログイン画面が返ってきました。デプロイの「アクセスできるユーザー」を「全員」にして、新しいバージョンでデプロイし直してください。";
      else if (t.startsWith("error")) why = `スクリプトのエラー：${t.slice(0, 150)}`;
      console.error("sendMail GAS failed", r.status, t.slice(0, 300));
      return { ok: false, detail: why };
    }
  } catch (e) {
    console.error("sendMail failed", e);
    return { ok: false, detail: `送信エラー：${String(e).slice(0, 150)}` };
  }
  return { ok: false, detail: "メール送信の設定がまだです。" };
}

export async function mailConfigured() {
  const s = await getSettings();
  return !!((s.mail_provider === "resend" && s.resend_api_key) || s.gas_mail_url);
}
