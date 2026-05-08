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
画面は開始 → Q1 → Q2 → Q3 → 任意属性 → 完了の逐次フローにする。Q1 が `none` / `no_answer` の場合は Q2 をスキップして Q3 へ進める。Q1/Q2 の選択肢順は回答開始時にランダム化し、API payload に display order として送る。当初 Q3 と属性は任意回答としていたが、後続レビューで Q3 は `no_answer` を含む必須回答、属性のみ任意回答へ変更する。

### Alternatives
既存の `localStorage` 配列を残して API と二重保存する案もあるが、保存経路が分かれて検証が難しくなるため採用しない。失敗マーク UI はネット配布時の説明負荷が高く、MVP の DB スキーマにも含めていないため削除する。

### Consequences
回答者向け UI から local D1 へ保存できるようになる一方、ブラウザ内 CSV ダウンロードとローカル統計表示は削除される。CSV は後続の管理導線または API から取得する。FingerprintJS と `user_key` / `fingerprint_key` 生成は未実装のまま残る。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` を確認する。Wrangler dev 上で `/` が 200 を返すこと、terminal Q1 payload が `POST /api/survey/responses` で保存できることを確認する。

### Notes
Q3 は当初 option を選ばずに完了できる設計だったが、後続レビューで必須回答へ変更した。現在は `no_answer` を明示的に選んだ場合のみ `q3_answer = 'no_answer'` として保存する。

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
Q3 はこの時点では任意回答のままだったが、後続レビューで必須回答へ変更した。現在は未選択で本体回答を完了できず、明示的に「回答しない」を選んだ場合は `q3_answer = 'no_answer'` として保存する。

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

## [2026-05-07] Q3 必須化と任意属性最終画面の整理

### Context
Q3 の画面に「任意」と表示されていたが、選択肢に `no_answer` があるため、Q1〜Q3 までは本体設問として必須にしてよいというレビューがあった。また、任意属性画面の「回答ありがとうございました。」表示が、完了済みなのか最後の入力画面なのか分かりづらかった。

### Decision
Q3 は `no_answer` を含む必須回答に変更する。UI では `質問 3 / 3` と表示し、未選択では次へ進めない。API validation でも `q3Answer` を必須にする。この時点では任意属性を独立した最終ステップとして整理したが、後続 ADR で完了画面内カードへ統合した。

### Alternatives
Q3 を任意のまま維持する案もあるが、`回答しない` が明示選択肢としてあるため、未回答と明示拒否を分けるよりも本体設問として揃える方が画面上も分析上も分かりやすい。任意属性画面で「回答せず終了」ボタンを残す案は、最後の画面としての位置づけが曖昧になるため採用しない。

### Consequences
今後の回答では `q3_answer` が必ず入る。既存のローカル試験データには `NULL` の Q3 が残る可能性があるが、本番配布前のデータなので分析対象には含めない。任意属性は空欄でも送信でき、性別または年齢が入った場合のみ PATCH する。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` で型・ビルドが通ることを確認する。local API に対して `q3Answer` なしの POST が失敗し、`q3Answer: "no_answer"` または familiarity option がある POST は成功することを確認する。

### Notes
任意属性の `gender = no_answer` は明示回答なのでチェック済み扱いにする。年齢は数字入力のため、空欄の場合のみ未回答扱いにする。

## [2026-05-07] 完了画面への任意属性カード統合

### Context
独立した任意属性画面では、完了画面なのか追加入力画面なのかが分かりづらかった。レビューでは、`ご協力ありがとうございました！` の直下に性別・年齢フォームを置き、任意項目を1つのカードにまとめ、その内部に送信ボタンを持たせる案が出た。

### Decision
本体回答の POST 成功後は直接 `complete` 画面へ遷移する。完了画面には本体回答が送信済みであることを表示し、その下に小さめの `任意項目` カードを置く。性別・年齢はカード内にまとめ、カード内の `任意項目を送信する` ボタンで PATCH する。入力しない場合は何も押さずに閉じられるようにし、`入力せず完了` のような別ボタンは置かない。

### Alternatives
任意属性を独立ステップのまま残す案もあるが、本体回答完了後の追加協力という意味が画面構造から伝わりにくいため採用しない。カード外に送信ボタンを置く案は、どの入力に対する送信か分かりにくいため採用しない。

### Consequences
step は `start` / `q1` / `q2` / `q3` / `complete` に単純化される。任意属性は本体回答とは独立した追加送信として扱われ、未入力なら送信ボタンは無効になる。任意属性送信後はカード内に送信済みメッセージを表示する。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` で型・ビルドが通ることを確認する。local API に対して本体回答 POST 後、完了画面の任意属性カードから `gender` / `ageGroup` を PATCH できることを確認する。

### Notes
当初 `もう一度回答する` は完了画面下部に ghost button として残したが、ネット配布時には意図が分かりにくいため後続 ADR で削除した。

## [2026-05-07] 任意項目送信後表示と再回答導線の整理

### Context
完了画面内の任意項目カードでは、送信後も性別・年齢フォームが残っており、`任意項目を送信しました` というテキストだけでは状態変化が弱かった。また、`もう一度回答する` はネット配布では重複回答を促すように見え、意図が分かりにくい。

### Decision
任意項目を送信したら、カード内部をチェックマーク付きの送信済み表示へ切り替え、性別・年齢の入力 UI と送信ボタンは非表示にする。完了画面の `もう一度回答する` ボタンは削除する。

### Alternatives
送信済みメッセージだけを追加してフォームを disabled 表示で残す案もあるが、画面が重くなり、送信後にまだ操作できそうに見えるため採用しない。再回答ボタンを残す案は、重複回答抑制方針と相性が悪いため採用しない。

### Consequences
送信後の状態が明確になり、回答者はページを閉じればよいことが分かりやすくなる。一方、同じブラウザで再回答する導線は UI から消えるため、テスト時はページ reload や local state reset で対応する。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` で型・ビルドが通ることを確認する。local 画面で任意項目送信後にフォームが消え、チェック付き完了表示に変わることを確認する。

### Notes
本体回答の再回答制御は、後続の `user_key` / `fingerprint_key` 実装時に改めて扱う。

## [2026-05-07] アンケート画面の visual pass

### Context
Q1/Q2/Q3 の機能実装は進んだが、画面確認で参考画像の「スマホ幅カード、Qバッジ、ステッパー、縦並び選択肢、下部ナビ」と現在の広いグリッド UI の差が大きいことが分かった。まずは配布前に回答者が迷わない見た目へ寄せる。

### Decision
保存 API と DB スキーマは変更せず、`app/page.tsx` の表示部品を整理する。Q1/Q2/Q3 は白いカード型シェル、青い Q バッジ、Q1/Q2/Q3/完了ステッパー、縦並びの選択肢行、戻る/次への下部フッターを持つ構成に寄せる。Q1/Q2 は選択直後に自動遷移せず、参考画像に合わせて選択後に `次へ` で進む。Q3 は familiarity の必須設問として、低い→高いの縦スケールを添える。

### Alternatives
生成済みアイコンをこの PR で個別画像として投入する案もあるが、まずはレイアウトの差を潰す方が優先度が高いため採用しない。参考画像と完全一致する固定サイズ実装も考えられるが、実配布ではスマートフォン幅の違いに耐える必要があるため、レスポンシブなカード幅と余白で実装する。

### Consequences
参考画像に近い回答体験になり、選択肢を選んでから次へ進む操作も分かりやすくなる。一方、アイコンはまだ lucide ベースの仮アイコンであり、生成画像アイコンの投入は後続作業として残る。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` で型・ビルドを確認する。Wrangler dev 上で `/` が 200 を返すこと、本体回答 POST と任意属性 PATCH が引き続き動くことを確認する。

### Notes
Q1/Q2 の `その他` は引き続き modal で自由記述を確定する。参考画像の inline input 化は、生成アイコン投入や細かなスタイル調整と合わせて後続で扱う余地を残す。

## [2026-05-07] visual pass レビュー反映

### Context
PR4 の画面確認で、Q1 下部のランダム表示説明は回答者に不要であること、Q3 の `回答しない` が低い→高いスケールの最下部にあり「最も慣れている」選択肢のように見えることが分かった。

### Decision
Q1 のランダム表示説明は削除する。Q3 は familiarity scale に属する5選択肢だけを低い→高い矢印の横に置き、`回答しない` は破線区切りの下に独立した選択肢として表示する。

### Alternatives
`回答しない` をスケールの最上部や中間に移す案もあるが、順序尺度ではないためスケール外に分離する方が誤読が少ない。Q1 の説明を小さく残す案は、回答者向けには不要で画面密度を上げるため採用しない。

### Consequences
Q1 の画面が少し短くなり、Q3 では `回答しない` が familiarity の高低と無関係な明示拒否として見えやすくなる。データ保存や option id は変更しない。

### Checks
`tsc --noEmit`、`next build`、`opennextjs-cloudflare build` で型・ビルドを確認する。

### Notes
アイコンは引き続き lucide の仮アイコンで、後続 PR で生成アイコンを個別投入する。

## [2026-05-08] Cloudflare production deploy 準備

### Context
PR4 まで main に merge され、ローカル D1 + OpenNext/Workers で動作する状態になった。次は本番配布に向けて Cloudflare 上の D1 と Workers deploy を行う。

### Decision
本番は Cloudflare Workers 上の OpenNext adapter と Cloudflare D1 binding `DB` で構成する。D1 database `system-engineering-form` を APAC location hint で作成し、`wrangler.jsonc` の `database_id` を本番 D1 UUID に差し替える。remote migration 用に `d1:migrate:remote` script を追加する。CSV export は production で `EXPORT_TOKEN` 未設定のまま公開されないよう、token 未設定時は localhost からのアクセスだけ許可する。

### Alternatives
Pages で Next.js を deploy する案もあるが、今回の app は Route Handler と D1 binding を使うため、Cloudflare の Next.js Workers guide に沿って OpenNext on Workers を採用する。D1 の location hint を指定しない案もあるが、回答者が日本の学生中心であるため APAC を指定する。

### Consequences
本番 deploy 前に remote D1 migration を適用できる。CSV export endpoint は `EXPORT_TOKEN` secret を設定しない限り production では 401 になるため、誤公開を避けられる。一方、CSV を本番で取得するには secret 設定と token 共有が必要になる。

### Checks
`wrangler whoami` でログインを確認する。`wrangler d1 list` / `wrangler d1 create system-engineering-form --location=apac` で本番 D1 を作成する。`wrangler d1 migrations apply system-engineering-form --remote` で schema を適用し、`opennextjs-cloudflare build` と deploy 後の smoke test を行う。

### Notes
作成した本番 D1 database id は `abc4a01a-5928-4b54-88ce-2d84cdd31e49`。Cloudflare docs では D1 migration は database name または binding name で実行できるが、database name の方が binding rename の影響を受けにくい。

## [2026-05-08] Cloudflare production deploy 実施

### Context
本番 D1 作成と schema migration が完了したため、OpenNext bundle を Cloudflare Workers に deploy し、本番 URL と API/D1 の疎通を確認する。

### Decision
`npx pnpm@10.33.4 run deploy` で OpenNext build と deploy をまとめて実行する。CSV export は `EXPORT_TOKEN` を Cloudflare Worker secret として設定し、token なしでは 401、Bearer token 付きでは 200 になることを確認する。本番 smoke test で 1 件 POST した回答は確認後に remote D1 から削除し、本番 DB は空に戻す。

### Alternatives
`opennextjs-cloudflare deploy` のみを直接実行する案もあるが、既存 `.open-next` bundle を deploy してしまい最新コードが反映されない可能性があるため、deploy 時は必ず `build && deploy` を使う。

### Consequences
本番 URL `https://system-engineering-form.shogo-kitada.workers.dev` でフォームを配布できる状態になった。D1 は remote APAC/NRT で `survey_responses` を持ち、回答 POST が D1 に保存される。CSV export は secret token がない限り外部公開されない。

### Checks
本番 `/` が 200 を返すこと、`POST /api/survey/responses` が 201 相当の response JSON を返すこと、remote D1 の `survey_responses` row count が増えること、smoke test row 削除後に row count が 0 に戻ること、CSV export が token なし 401 / token あり 200 になることを確認した。

### Notes
Wrangler 4.88.0 の deploy 出力では D1 binding の resource 表示が `system-engineering-form-local` と出るが、本番 API の POST 後に remote D1 `abc4a01a-5928-4b54-88ce-2d84cdd31e49` の row count が増えることを確認済み。
