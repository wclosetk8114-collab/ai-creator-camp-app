/**
 * AI Creator Camp メール送信の中継（Gmailから送る・無料）
 * 1. https://script.google.com で「新しいプロジェクト」→ このコードを全部貼る
 * 2. 下の SECRET を、管理画面「設定 ③ Apps Script の合言葉」と同じ文字にする
 * 3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *    次のユーザーとして実行：自分 ／ アクセスできるユーザー：全員 → デプロイ
 * 4. 出てきた「ウェブアプリのURL」を、管理画面「設定 ③ Apps Script のウェブアプリURL」に貼って保存
 * ※コードを直したら「デプロイを管理 → 編集 → バージョン：新バージョン」で更新すること
 */
var SECRET = 'ここに合言葉';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return ContentService.createTextOutput('ng');
    MailApp.sendEmail({ to: d.to, subject: d.subject, body: d.body, name: 'AI Creator Camp' });
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}

// 初回だけ実行して、メール送信の許可を出しておく
function authorize() {
  MailApp.getRemainingDailyQuota();
}
