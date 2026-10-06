# AI Creator Camp 会員アプリ

ツール購入 → スクール（90日・12ステージ）→ 修了後の専門コース（月3,980円）までを一つで管理する会員アプリ。
課題の提出・AI審査・相談は公式LINEで行い、運営がいない時間もAIが回す。

## 公開URL
- アプリ: https://ai-creator-camp-app.vercel.app
- 管理画面: /admin（パスワードは Vercel の環境変数 `ADMIN_PASSWORD`）

## 料金（税込・学生は半額）
| プラン | 初回 | 2・3ヶ月目 | 3ヶ月合計 | 4ヶ月目〜 |
|---|---|---|---|---|
| ツールのみ | 30,000 | - | 30,000 | - |
| スクールつき・分割 | 30,000（ツール） | 月10,000 | 50,000 | 月3,980 |
| スクールつき・月額 | 50,000（ツール＋1ヶ月目） | 月20,000 | 90,000 | 月3,980 |

- 分割は Checkout で「ツール代（単発）＋スクール月10,000（30日トライアル）」。
- スクール代を規定回数（分割2回／月額3回）払うと、Stripe Webhook（invoice.paid）でサブスクの価格を専門コース（3,980／学生1,990）に差し替える。

## 構成
- Next.js 15（App Router）on Vercel
- DB: Supabase（共有プロジェクト `zcfjbqpgjsicrcnthdod` の `camp` スキーマ、専用ロール `camp_app`、接続プーラー経由）
- 決済: Stripe（Checkout / Billing Portal / Webhook）
- LINE: Messaging API（Webhook `/api/line/webhook`）
- AI: Anthropic（審査 `gradeSubmission`・相談 `mentorReply`）
- メール: Google Apps Script 中継（`docs/mail-relay.gs`）または Resend
- 秘密の値（LINE / Stripe / メール）は DB の `camp.settings` に保存し、管理画面「設定」から入れる

## 環境変数（Vercel）
`DATABASE_URL` `SESSION_SECRET` `ADMIN_PASSWORD` `APP_URL` `CRON_SECRET` `ANTHROPIC_API_KEY`

## LINEのコマンド
提出（→文章・URL・画像→「以上」）／いまの課題／交流会／参加 N／専門 動画・アプリ・自動化・アート／学生証／マイページ／スタッフ／それ以外はAI相談

## DB
- `db/schema.sql` … テーブルとロール
- `db/seed_stages.sql` … 初期カリキュラム（管理画面から編集可）

## 売却・切り出し
`camp` スキーマだけを pg_dump すれば、このサービスのデータを丸ごと移せる。
