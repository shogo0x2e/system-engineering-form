## [2026-05-01] 情報疲れ調査 CSV の分析ノートブック作成

### Context
local university で近年の情報疲れが発生しており、特に SNS と AI チャット・AI 検索が主な負担媒体になっているという仮説を、`survey` 配下の調査結果 CSV から探索的に確認したい。

### Decision
`survey` 配下に Jupyter Notebook を追加し、CSV の読み込み、失敗回答の除外、媒体別・負担理由別の集計、媒体と負担理由のクロス集計、横棒グラフと積み上げ棒グラフによる可視化を行う。ローカル Python に `pandas` / `matplotlib` / `jupyter` が入っていないため、notebook は標準ライブラリ中心で動く構成にする。

### Alternatives
`pandas` と `matplotlib` を前提にした分析も検討したが、現環境では依存パッケージが未導入であり、リポジトリ外への依存追加が必要になるため今回は採用しない。CSV 件数が小さいため、複雑な統計モデルや推定よりも、件数・割合・クロス集計の可視化を優先する。

### Consequences
notebook は軽量で再実行しやすい一方、高度な統計検定や洗練されたプロットは含めない。現時点のサンプル数では結論は「仮説を支持する初期傾向」に留め、次回調査では情報疲れの有無・強度や媒体利用頻度を追加する必要がある。

### Checks
`survey/*.csv` の列構成、失敗フラグ、有効回答数、媒体別件数、負担理由別件数、`媒体 × 負担のタイプ` のクロス集計を確認する。作成した notebook は JSON として妥当であること、各 code cell が Python 構文として妥当であること、標準ライブラリ環境で最後まで実行できることを確認した。

### Notes
現時点の CSV は全 24 件、有効回答 23 件、失敗 1 件。予備集計では SNS が最多、AI チャット・AI 検索が次点グループに入り、SNS と AI の合算が有効回答の過半を占める。

## [2026-05-07] Cloudflare D1 ローカル永続化基盤の追加

### Context
アンケートフォームは現在フロントエンドの `localStorage` とブラウザ内 CSV ダウンロードで動いている。今後 Cloudflare D1 に載せる前提で、まずは本番 D1 を作らずにローカル D1 で migration と Workers/OpenNext の土台を確認できる状態にする。

### Decision
PR1 では Cloudflare/OpenNext の最小基盤だけを追加する。`wrangler.jsonc` に D1 binding `DB` を定義し、`migrations/0001_create_survey_responses.sql` に YAGNI 方針の単一テーブル `survey_responses` を置く。回答整合性は DB の制約ではなく、後続 PR の zod/API 層で管理する。

### Alternatives
ローカル Docker で Postgres や `better-sqlite3` を使う案も検討したが、最終的な D1 移行時に接続 API が変わる。Wrangler local D1 を使えば D1 migration と binding の形を先に固められるため、今回は採用しない。append-only event log や option table は分析自由度が高い一方、今回の MVP には重いため採用しない。

### Consequences
本番 D1 作成前でも local migration と OpenNext preview の確認ができる。スキーマは `q1_answer` / `q2_answer` / `q3_answer` を中心とする latest-state 保存なので、初回回答・変更履歴・canonical 判定は保存しない。必要になった場合は後続 migration で拡張する。

### Checks
`wrangler d1 migrations apply system-engineering-form --local` でローカル D1 に migration を適用する。`wrangler d1 execute system-engineering-form --local --command "SELECT name FROM sqlite_master WHERE type = 'table';"` で `survey_responses` の作成を確認する。既存画面への影響は `pnpm build` で確認する。

### Notes
D1 の本番 database_id は未作成のため、`wrangler.jsonc` では placeholder を置き、local 開発用に `preview_database_id` を設定する。本番 D1 作成後に `database_id` を差し替える。

## [2026-05-07] アンケート回答 API と CSV export の追加

### Context
ローカル D1 基盤が入ったため、次は UI 変更より先にサーバー側の保存境界を作る。今回の PR では既存画面の `localStorage` フローは触らず、後続 PR から呼べる D1 API、zod validation、CSV export を用意する。

### Decision
HTTP route、service、repository を薄く分ける。route は request/response と status code、service は入力正規化・ID生成・CSV生成、repository は D1 SQL だけを担当する。DB 制約は最小限のままにし、option id や `other` の整合性は `lib/survey/schema.ts` の zod schema で検証する。

### Alternatives
Drizzle や ORM を入れる案もあるが、MVP の DB は `survey_responses` 1テーブルであり、操作も INSERT/UPDATE/SELECT に限られるため採用しない。API route に SQL を直接書く案もあるが、D1 本番移行やテスト時の差し替えを考え、repository に閉じ込める。

### Consequences
後続 PR ではフロントエンドから `POST /api/survey/responses` と `PATCH /api/survey/responses/:id` を呼ぶだけで D1 保存へ移れる。CSV export は `EXPORT_TOKEN` が設定されている場合のみ token を要求し、未設定のローカル開発ではそのまま確認できる。

### Checks
`next build` と `opennextjs-cloudflare build` で route handler と Cloudflare bundle のビルドを確認する。local D1 に対して `wrangler dev` 経由で API POST/PATCH/CSV export を手動確認する。

### Notes
Q3 の option id は当初の handoff に合わせ、`never` / `tried_few_times` / `occasionally` / `weekly` / `daily` / `heavy` / `no_answer` とする。変更が必要な場合は `lib/survey/options.ts` と `lib/survey/schema.ts` を更新する。

## [2026-05-07] フロントエンド回答フローの API 保存対応

### Context
サーバー側 API と CSV export が入ったため、既存の `localStorage` 保存・Q1/Q2のみの画面を新しいアンケート仕様へ移行する。今回の PR では local D1 に回答を保存できる UI フローを作る。

### Decision
画面は開始 → Q1 → Q2 → Q3 → 任意属性 → 完了の逐次フローにする。Q1 が `none` / `no_answer` の場合は Q2 をスキップして Q3 へ進める。Q1/Q2 の選択肢順は回答開始時にランダム化し、API payload に display order として送る。Q3 と属性は任意回答とし、本体回答は Q3 画面の完了操作で `POST /api/survey/responses` に保存する。

### Alternatives
既存の `localStorage` 配列を残して API と二重保存する案もあるが、保存経路が分かれて検証が難しくなるため採用しない。失敗マーク UI はネット配布時の説明負荷が高く、MVP の DB スキーマにも含めていないため削除する。

### Consequences
回答者向け UI から local D1 へ保存できるようになる一方、ブラウザ内 CSV ダウンロードとローカル統計表示は削除される。CSV は後続の管理導線または API から取得する。FingerprintJS と `user_key` / `fingerprint_key` 生成は未実装のまま残る。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` を確認する。Wrangler dev 上で `/` が 200 を返すこと、terminal Q1 payload が `POST /api/survey/responses` で保存できることを確認する。

### Notes
Q3 は option を選ばずに完了でき、その場合 `q3_answer` は `NULL` になる。`no_answer` を明示的に選んだ場合は `q3_answer = 'no_answer'` として保存する。
