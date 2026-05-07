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
Q3 の option id は当初の handoff に合わせ、`never` / `tried_few_times` / `occasionally` / `weekly` / `daily` / `heavy` / `no_answer` として実装したが、後続の設問見直しで AI 利用頻度ではなく familiarity を聞く方針へ変更した。現在の正は後続 ADR の Q3 familiarity 設問である。

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

## [2026-05-07] PR3 レビュー対応とアイコン生成方針

### Context
PR3 の画面実装に対して、フォーム値の `useState` が多く、`react-hook-form` を使う方がよいのではないかというレビュー観点が出た。また、Q1/Q2/Q3 の選択肢アイコンは参考画像のトリミングではなく新規生成する方針になった。

### Decision
PR3 内では見た目を大きく変えず、Q1/Q2/Q3/任意属性の回答値だけを `react-hook-form` に移す。画面 step、送信状態、エラー、free text modal の開閉はフォーム値ではなく UI 状態として `useState` に残す。アイコンはまず生成シートでトーンを確認し、実投入は後続 PR で個別ファイル化して行う。

### Alternatives
すべての状態を `react-hook-form` に寄せる案もあるが、step 遷移や modal 開閉までフォームに入れると責務が混ざるため採用しない。参考画像からアイコンをトリミングする案は、解像度・背景混入・ライセンス不明・トーン統一の面でリスクがあるため採用しない。

### Consequences
回答値の更新・取得・reset が一箇所にまとまり、後続の visual pass で入力部品を差し替えやすくなる。生成アイコンは現時点では repo に取り込まず、PR4/PR5 でレイアウト調整と個別アイコン投入を分ける余地を残す。

### Checks
`tsc --noEmit` と `next build` で `react-hook-form` 化後も型・ビルドが通ることを確認する。生成したアイコンシートは目視で、必要な選択肢の絵柄が揃っているか確認する。

### Notes
生成アイコンシートは `/Users/shogo/.codex/generated_images/019de27c-f43c-7271-afe0-997b5e7ccf18/ig_0281c60b81d01e0d0169fc1a1a37d4819187beb41eae5b04c7.png` に保存されている。

## [2026-05-07] Q3 を AI 利用頻度から familiarity 設問へ修正

### Context
PR3 の画面確認中、Q3 が「AIチャット・AI検索をどの程度利用しているか」という利用頻度寄りの設問になっていた。設計上の意図は、主分析の後に AI 文脈を補助的に聞きつつ、頻度ではなく AIチャット・AI検索への慣れや使い分け可能性を取得することだった。

### Decision
Q3 の質問文を「AIチャット・AI検索への慣れに最も近いもの」に変更し、選択肢 ID も `never_used` / `rarely_used` / `sometimes_uncertain` / `basic_familiar` / `purposeful_use` / `no_answer` に変更する。DB は `q3_answer TEXT` のため migration は不要とする。

### Alternatives
旧 ID のまま label だけ変える案もあるが、CSV 分析時に `weekly` や `daily` が familiarity を意味する状態になると誤読しやすいため採用しない。利用頻度を別設問として残す案は、今回の MVP では設問数を増やすため採用しない。

### Consequences
PR3 前に local D1 に入った試験データには旧 Q3 ID が含まれる可能性がある。配布前のローカル試験データなので本番分析対象には含めない。以後の API validation は新 Q3 ID のみを受け付ける。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` で Q3 ID 変更後も型・ビルドが通ることを確認する。local 画面は refresh 後に Q3 の質問文と選択肢が familiarity 表現になっていることを確認する。

### Notes
Q3 は任意回答のままであり、未選択で本体回答を完了した場合は `q3_answer = NULL`、明示的に「回答しない」を選んだ場合は `q3_answer = 'no_answer'` として保存する。

## [2026-05-07] 任意属性の年齢を年齢層選択から数字入力へ変更

### Context
任意属性画面の年齢が `18歳未満` / `18〜19歳` / `20〜24歳` などの選択肢になっていたが、画面確認時に「選択肢ではなく数字を直接入れる方がよい」というレビューがあった。任意属性は主分析ではなくサンプル説明用であり、回答者数も小さいため年齢層に丸める必要性は高くない。

### Decision
フロントエンドでは年齢を `type="number"` の任意入力に変更する。API/DB の既存互換のため request key は `ageGroup`、DB column は `age_group` のまま残すが、保存値は `"20"` のような数字文字列とする。zod validation は 0〜120 の整数文字列のみ許可する。

### Alternatives
DB column を `age` に rename する案もあるが、D1 migration と CSV header 変更が必要になり PR3 の範囲を広げるため採用しない。年齢層選択を維持する案は、ユーザー入力の自然さとレビュー指摘に合わないため採用しない。

### Consequences
CSV 上の `age_group` には年齢層 ID ではなく数字文字列が入る。後続でスキーマを整理する場合は `age_group` を `age` に rename する migration を検討できる。空欄の場合は `NULL` として保存し、回答しない専用 option は持たない。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` で型・ビルドが通ることを確認する。local API に対して `ageGroup: "20"` が保存できることを確認する。

### Notes
年齢は任意属性であり、未入力でも本体回答は有効なまま完了できる。
