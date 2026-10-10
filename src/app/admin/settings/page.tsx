import { appUrl, getSettings } from "@/lib/settings";
import { connectLine, saveSettings, sendNoticeNow, setupStripe, testMail } from "../actions";
import { quotaLeft } from "@/lib/line";

export const dynamic = "force-dynamic";

function mask(v: string) {
  return v ? `設定済み（…${v.slice(-4)}）` : "未設定";
}

function Secret({ name, label, value, help }: { name: string; label: string; value: string; help?: string }) {
  return (
    <div>
      <label>{label} <span className={`pill ${value ? "ok" : "warn"}`}>{mask(value)}</span></label>
      <input type="password" name={name} placeholder={value ? "変えるときだけ入力" : ""} autoComplete="off" />
      <input type="hidden" name={`${name}__secret`} value="1" />
      {help && <p className="muted" style={{ margin: "4px 0 0" }}>{help}</p>}
    </div>
  );
}

function Plain({ name, label, value, help }: { name: string; label: string; value: string; help?: string }) {
  return (
    <div>
      <label>{label}</label>
      <input type="text" name={name} defaultValue={value} />
      {help && <p className="muted" style={{ margin: "4px 0 0" }}>{help}</p>}
    </div>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; line?: string; stripe?: string; mail?: string; notice?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const left = s.line_access_token ? await quotaLeft(s.line_access_token) : null;
  return (
    <>
      <h1>設定</h1>
      {sp.saved && <div className="okbox">保存しました</div>}
      {sp.line && <div className="warnbox">{sp.line}</div>}
      {sp.stripe && <div className="warnbox">{sp.stripe}</div>}
      {sp.mail && <div className="warnbox">{sp.mail}</div>}
      {sp.notice && <div className="warnbox">{sp.notice}</div>}

      <form action={saveSettings}>
        <div className="card">
          <h3>① 公式LINE</h3>
          <p className="muted">LINE Developers の Messaging API チャネルの値を入れて保存 →「LINEとつなぐ」を押すと、Webhookと下のメニューが自動で設定されます。</p>
          <Secret name="line_channel_secret" label="チャネルシークレット" value={s.line_channel_secret} />
          <Secret name="line_access_token" label="チャネルアクセストークン（長期）" value={s.line_access_token} />
          <Plain name="line_friend_url" label="友だち追加URL" value={s.line_friend_url} help="「LINEとつなぐ」で自動で入ります" />
          <p className="muted">Webhook URL：{appUrl()}/api/line/webhook</p>
        </div>

        <div className="card">
          <h3>② Stripe（決済）</h3>
          <Secret name="stripe_secret_key" label="シークレットキー（sk_live_…）" value={s.stripe_secret_key} help="AIクリエイターのStripe → 開発者 → APIキー。保存すると、価格とWebhookがこのアカウントに自動でできます" />
          <Secret name="stripe_webhook_secret" label="Webhook署名シークレット（whsec_…）" value={s.stripe_webhook_secret} help="自動で入ります。触らなくてOK" />
          <details style={{ marginTop: 10 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>価格ID（ふだんは触らない）</summary>
            <div className="grid2">
              {["price_tool", "price_tool_student", "price_school_a", "price_school_a_student", "price_school_b", "price_school_b_student", "price_cont", "price_cont_student", "price_school_single", "price_school_single_student", "price_school_single2", "price_school_single2_student"].map((k) => (
                <Plain key={k} name={k} label={k} value={s[k] || ""} />
              ))}
            </div>
          </details>
        </div>

        <div className="card">
          <h3>③ メール送信（ログインコード・申込確認）</h3>
          <label>送り方</label>
          <select name="mail_provider" defaultValue={s.mail_provider || "gas"}>
            <option value="gas">Gmail から送る（Google Apps Script・無料）</option>
            <option value="resend">Resend（有料・独自ドメイン）</option>
          </select>
          <Plain name="gas_mail_url" label="Apps Script のウェブアプリURL" value={s.gas_mail_url} help="手順書の「メール送信の設定」を見てください" />
          <Secret name="gas_mail_secret" label="Apps Script の合言葉" value={s.gas_mail_secret} />
          <Secret name="resend_api_key" label="Resend APIキー" value={s.resend_api_key} />
          <Plain name="mail_from" label="差出人（Resendのみ）" value={s.mail_from} />
          <Plain name="admin_email" label="新規申込の通知先" value={s.admin_email} />
        </div>

        <div className="card">
          <h3>④ ツールの受け取り</h3>
          <Plain name="tool_download_url" label="ツール一式のURL（Googleドライブなど）" value={s.tool_download_url} />
          <Plain name="tool_guide_url" label="手順書のURL" value={s.tool_guide_url} />
        </div>

        <div className="card">
          <h3>⑤ 週のお知らせ（LINE＋メール）</h3>
          <p className="muted">月・金・土の朝9時に、スクールの人へ自動で送ります。{"{name}"}＝名前、{"{stage}"}＝その人のいまの課題。<br />
          今月こちらから送れる残り：{left === null ? "不明" : left >= 100000 ? "上限なし" : `${left}通`}（無料プランは月200通。返信は数に入りません）</p>
          <input type="hidden" name="notice_form" value="1" />
          <label className="check"><input type="checkbox" name="notice_enabled" value="1" defaultChecked={s.notice_enabled === "1"} /> 自動で送る</label>
          <label className="check"><input type="checkbox" name="notice_email" value="1" defaultChecked={s.notice_email !== "0"} /> メール（申し込み時のアドレス）にも送る（合格時の次の課題も）</label>
          <label>送り方</label>
          <select name="notice_mode" defaultValue={s.notice_mode || "auto"}>
            <option value="auto">残りがあるうちは送る → 足りなくなったら、次に話しかけてきたときの返信に乗せる</option>
            <option value="reply">いつも返信に乗せる（通数を使わない）</option>
          </select>
          <Plain name="notice_keep" label="残しておく通数（個別メッセージ用）" value={s.notice_keep || "20"} />
          <label>月曜：今週の課題</label><textarea name="notice_mon" defaultValue={s.notice_mon} style={{ minHeight: 110 }} />
          <label>金曜：途中チェック</label><textarea name="notice_fri" defaultValue={s.notice_fri} style={{ minHeight: 90 }} />
          <label>土曜：提出</label><textarea name="notice_sat" defaultValue={s.notice_sat} style={{ minHeight: 90 }} />
        </div>

        <div className="card">
          <h3>⑥ AI</h3>
          <Plain name="ai_model" label="使うモデル" value={s.ai_model} help="審査と相談に使います。ふだんは触らなくてOK" />
        </div>

        <button className="btn">保存</button>
      </form>

      <form action={sendNoticeNow} className="card" style={{ marginTop: 16 }}>
        <h3>週のお知らせを今すぐ送る</h3>
        <p className="muted">⑤を保存してから押してください。曜日を待たずに、スクールの全員へ送ります。</p>
        <div className="row">
          <button className="btn small ghost" name="day" value="mon">月曜の分</button>
          <button className="btn small ghost" name="day" value="fri">金曜の分</button>
          <button className="btn small ghost" name="day" value="sat">土曜の分</button>
        </div>
      </form>

      <form action={testMail} className="card" style={{ marginTop: 16 }}>
        <h3>テストメールを送る</h3>
        <p className="muted">③を保存したあとに押すと、「新規申込の通知先」にテストメールを送ります。届かないときは、理由がここに出ます。</p>
        <button className="btn small ghost">テストメールを送る</button>
      </form>

      <form action={setupStripe} className="card" style={{ marginTop: 16 }}>
        <h3>Stripeの価格とWebhookを作り直す</h3>
        <p className="muted">ふだんは不要。キー保存のときに自動で行います。うまくいかなかったときだけ押してください。</p>
        <button className="btn small ghost">Stripeを設定し直す</button>
      </form>

      <form action={connectLine} className="card" style={{ marginTop: 16 }}>
        <h3>LINEとつなぐ</h3>
        <p className="muted">①を保存してから押してください。Webhookの設定と、画面下のメニュー（提出／いまの課題／交流会／マイページ／使い方／スタッフ）を自動で入れます。</p>
        <button className="btn small">LINEとつなぐ</button>
      </form>
    </>
  );
}
