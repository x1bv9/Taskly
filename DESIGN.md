# Taskly — 設計書 (STEP 1)

## 概要
- サービス名: Taskly — 「面倒な事務作業を、ブラウザだけで簡単に。」
- 対象: 個人事業主 / 中小企業 / 飲食店 / 小規模店舗 / フリーランス / 副業
- 公開環境: GitHub Pages (静的ホスティングのみ)
- 技術: HTML5 / CSS3 / Vanilla JS / LocalStorage / CDN任意 (現状 CDN 不使用)
- フレームワーク不使用 (React/Vue/Next.js なし)。バックエンド・有料API なし。
  すべての基本機能はブラウザ内で動作し、保存データは外部サーバーへ送信しない。

## ファイル構成
```
Taskly/
  index.html                 トップページ
  about/index.html           サービスについて
  contact/index.html         お問い合わせ (mailto生成・バックエンドなし)
  privacy/index.html / terms/index.html  プライバシーポリシー / 利用規約
  tools/index.html           ツール一覧
  404.html  sitemap.xml  robots.txt  README.md  DESIGN.md
  assets/css/style.css       共通デザイン (ネイビー/ブルー, #F8FAFC, 白カード)
  assets/js/common.js        共通ヘルパー (LocalStorage, 金額整形, トースト, FAQ)
  assets/js/calc.js          計算コア (税計算・利益計算・逆算、Nodeで単体テスト可能)
  assets/js/document.js      見積書・請求書 共通の書類エンジン (明細行, 税率別集計, 保存一覧)
  assets/js/estimate.js / invoice.js / profit.js / report.js / home.js
  tools/estimate/index.html  見積書メーカー
  tools/invoice/index.html   請求書メーカー
  tools/profit/index.html    利益率計算機
  tools/report/index.html    業務報告書メーカー
```

## デザイン
- メイン: ネイビー `#1E3A5F`、アクセント: ブルー `#2563EB`、背景 `#F8FAFC`、カード白、文字ダークグレー `#1F2937`
- 角丸カード、控えめシャドウ、統一ボタン、レスポンシブ (SP/タブレット/PC)、過度なアニメーションなし
- ヘッダー/フッターは各ページに静的に記述し、リンクはページの深さに応じた相対パスを使うため、
  GitHub Pages のサブディレクトリ (`https://<user>.github.io/<repo>/`) でも動作する。

## 金額計算の決めごと (誤差対策)
- 金額はすべて整数円で扱う。浮動小数点は表示直前まで使わず、税額は税率ごとに集計してから小数点以下を切り捨てる。
  - 明細金額 = 数量 × 単価 (整数)
  - 税率 r の小計 S_r に対し消費税 = floor(S_r × r / 100)、合計 = 小計合計 + 消費税合計
  - この方式を各ツール画面の「計算方法」欄に明記する。
- 利益率計算機: 販売手数料は「売上に対する手数料率 (%)」、その他経費は「合計」として明示。
  - 売上 = 販売価格 × 数量、総原価 = 原価 × 数量、手数料 = floor(売上 × 手数料率/100)、総経費 = 手数料 + その他経費
  - 粗利益 = 売上 − 総原価 − 総経費、利益率 = 粗利益 / 売上 × 100、原価率 = 総原価 / 売上 × 100
  - 目標利益率 m% からの逆算販売価格 = (原価 + その他経費/数量) / (1 − 手数料率/100 − m/100)（切り上げ）
  - 目標利益額 P からの販売価格 = (P + 総原価 + その他経費) / (数量 × (1 − 手数料率/100))（切り上げ）

## PDF / 印刷
- PDF機能は書類系ツール（見積書・請求書・業務報告書）のみ。利益率計算機はCSV出力のみ。
  「PDFダウンロード」はプレビューをA4幅に複製し、html2canvas + jsPDF（assets/vendor/ に同梱、CDN不要）で画像化してA4 PDFを直接ダウンロードする方式。html2pdf.js の一括変換は配置・スクロール依存で白紙PDFになる不具合を確認したため不採用。生成前に白紙チェックを行い、白紙ならダウンロードしない。画像化のため日本語フォント埋め込みなしでも文字化けしない。
  印刷時も入力フォーム (.editor-panel) を隠し、書類プレビューのみを A4 で出す。
- 適格請求書について: 登録番号・税率ごとの対価と消費税額を出せる構造にしたが、
  法令要件を満たすことを自動保証する表示はしない (仕様書 §3-B の通り)。

## 共通機能
- LocalStorage による自動保存 (ツールごと)・保存一覧 (見積書/請求書/報告書は複数件の保存・読込・削除)
- 入力バリデーションとエラー表示、リセット、印刷、スマホ対応
- XSS 対策: ユーザー入力は textContent / 値のエスケープ経由でのみ表示し、innerHTML へ直接挿入しない
- AdSense: 各HTMLの `<head>` 内に広告コード挿入位置をコメントで示し、プレースホルダ要素は置かないため未設定時に空白が出ない。広告コード自体は未設定。

## SEO
- 各ページ固有の title / meta description / OGP / パンくず / 見出し構造 / sitemap.xml / robots.txt
- canonical / OGP / sitemap / robots は公開先の実際の URL `https://x1bv9.github.io/Taskly/...` に設定済み。置換不要。

## 開発ステップと現状
- STEP 1 設計・ファイル構成: 完了 (このファイル)
- STEP 2 共通ヘッダー/フッター/トップページ: 完了
- STEP 3 利益率計算機: 完了 (逆算2種・複数商品比較・グラフ・CSV)
- STEP 4 見積書メーカー: 完了 (明細行の追加/削除、税率別集計、保存、印刷/PDF)
- STEP 5 請求書メーカー: 完了 (振込先、登録番号、税率別集計、保存一覧、印刷/PDF)
- STEP 6 業務報告書メーカー: 完了 (5テンプレート、リアルタイムプレビュー、保存一覧、印刷/PDF)
- STEP 7 共通機能統合: 完了 (common.js / calc.js / document.js)
- STEP 8 SEO・規約類: 完了 (各ページ meta、privacy/terms/contact、sitemap、robots)
- STEP 9 動作確認: ローカルで実施 (下記「検証」参照)
- STEP 10 GitHub Pages 公開: 未実施 — リポジトリ選択待ち (ユーザーが GitHub で対象リポジトリを選ぶ段階)

## 検証 (2026-11-18, Linux VM)
- `node --check` で全JSファイルの構文確認
- 計算ロジックの単体チェック (node): 税率別集計・利益率・逆算価格の既知の数値で確認
- `python3 -m http.server` で全ページを HTTP 取得し、内部リンクの存在確認
- 未検証: 実ブラウザでの印刷/PDF見た目、スマホ実機、GitHub Pages 本番 URL での canonical 置換
- ダミーボタンなし: トップ・各ツール・フッターのボタン/リンクはすべて実機能か実ページに繋がる。
  「追加予定のツール」欄はリンクではなく今後の候補の表示のみ。
