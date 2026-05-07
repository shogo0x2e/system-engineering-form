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
