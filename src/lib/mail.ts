import { getSettings } from "./settings";

// メール送信。Resend（APIキー）か、Google Apps Script の中継（無料・Gmailから送信）のどちらか。
export async function sendMail(to: string, subject: string, body: string): Promise<boolean> {
  const s = await getSettings();
  try {
    if (s.mail_provider === "resend" && s.resend_api_key) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${s.resend_api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: s.mail_from, to: [to], subject, text: body }),
      });
      return r.ok;
    }
    if (s.gas_mail_url) {
      const r = await fetch(s.gas_mail_url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ secret: s.gas_mail_secret, to, subject, body }),
        redirect: "follow",
      });
      const t = await r.text();
      return r.ok && t.includes("ok");
    }
  } catch (e) {
    console.error("sendMail failed", e);
    return false;
  }
  console.error("mail is not configured");
  return false;
}

export async function mailConfigured() {
  const s = await getSettings();
  return !!((s.mail_provider === "resend" && s.resend_api_key) || s.gas_mail_url);
}
