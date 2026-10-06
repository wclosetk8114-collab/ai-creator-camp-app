# 運用ルール
- 正本は GitHub リモート。更新は clone → 編集 → push（Vercel が自動デプロイ）。
- Vercel プロジェクトは 1 つだけ（ai-creator-camp-app）。再 create しない。
- 秘密の値はリポジトリに書かない（DB の camp.settings か Vercel の環境変数）。
- DB は camp スキーマ以外に触らない（同じ Supabase に他事業のテーブルがある）。
- 価格を変えるときは、Stripe の価格・camp.settings の price_*・src/lib/settings.ts の PLANS・JoinForm・LP（artigia リポ）・規約・特商法をすべてそろえる。
