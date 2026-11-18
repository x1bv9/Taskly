# BizTools

「面倒な事務作業を、ブラウザだけで簡単に。」をコンセプトにした、個人事業主・中小企業・フリーランス向けの無料Webツール集です。GitHub Pagesで公開できる完全静的なサイトで、すべての機能がブラウザ内で動作します。

## 提供ツール

| ツール | パス | 内容 |
|---|---|---|
| 見積書メーカー | `tools/estimate/` | 税率別（10%/8%/0%）消費税計算、保存、印刷・PDF保存 |
| 請求書メーカー | `tools/invoice/` | 適格請求書の記載項目に対応した様式、振込先、過去の請求書管理 |
| 利益率計算機 | `tools/profit/` | 粗利益・利益率計算、販売価格の逆算、複数商品比較、グラフ、CSV出力 |
| 業務報告書メーカー | `tools/report/` | テンプレート5種、リアルタイムプレビュー、保存、印刷・PDF保存 |

## 使用技術

- HTML5 / CSS3 / JavaScript（Vanilla JS、フレームワーク不使用）
- LocalStorage（入力の自動保存・名前付き保存）
- Canvas（利益率グラフを自前描画、外部ライブラリ不使用）
- バックエンド・外部API不使用

## ファイル構成

```
BizTools/
├── index.html              トップページ
├── 404.html                404ページ
├── robots.txt
├── sitemap.xml
├── README.md / DESIGN.md
├── assets/
│   ├── css/style.css       共通スタイル（印刷用A4レイアウト含む）
│   └── js/
│       ├── common.js       共通ヘルパー（保存・金額整形・トースト等）
│       ├── calc.js         計算コア（税計算・利益計算・逆算）※Nodeでの単体テスト可能
│       ├── document.js     見積書/請求書の共通ロジック
│       ├── estimate.js / invoice.js
│       ├── profit.js / report.js / home.js
├── tools/
│   ├── index.html          ツール一覧
│   ├── estimate/index.html
│   ├── invoice/index.html
│   ├── profit/index.html
│   └── report/index.html
├── about/index.html        サービスについて
├── contact/index.html      お問い合わせ（mailto方式）
├── privacy/index.html      プライバシーポリシー
└── terms/index.html        利用規約
```

すべての内部リンクは相対パスで記述しており、サブディレクトリ公開（`https://x1bv9.github.io/BizTools/`）でも動作します。

## ローカルでの確認方法

```bash
cd BizTools
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

## GitHub Pages 公開手順

1. GitHubで新しいリポジトリを作成します（例：リポジトリ名 `BizTools`）。
2. このフォルダの中身をリポジトリにpushします。
   ```bash
   git init
   git add .
   git commit -m "BizTools initial release"
   git branch -M main
   git remote add origin https://github.com/x1bv9/BizTools.git
   git push -u origin main
   ```
3. リポジトリの **Settings > Pages** を開き、Build and deployment の Source で **Deploy from a branch**、Branch で **main / (root)** を選んで保存します。
4. 数分後に `https://x1bv9.github.io/BizTools/` で公開されます。

## 公開URLについて

canonical・OGP・sitemap・robots は公開先の実際の URL `https://x1bv9.github.io/BizTools/` に設定済みです。URLの置換は不要です。

なお、お問い合わせページの宛先 `example@example.com`（`contact/index.html` 内）は未定のままです。実際の運営用メールアドレスが決まったら置き換えてください。置き換えるまでは、お問い合わせフォームはダミー宛先のメールアプリを開く動作になります。

## PDF出力の仕組み

PDF機能は書類系ツール（見積書・請求書・業務報告書）のみです。「PDFダウンロード」ボタンを押すと、書類プレビューをA4幅に複製して html2canvas で画像化し、jsPDFでA4 PDFとして直接ダウンロードします（ライブラリは `assets/vendor/` に同梱しているためCDN不要・オフラインでも動作します）。画像化する方式のため、日本語フォントの埋め込みなしでも文字化けしません。生成前にキャンバスが白紙でないか自動チェックし、白紙の場合はダウンロードせずエラー表示を出します。印刷時も入力欄は出ず、プレビューシートのみが印字されるよう `@media print` と `.editor-panel` の非表示で制御しています。利益率計算機にはPDF機能はなく、結果はCSVで出力します。

## 計算方式（消費税）

- 単価は税抜価格として扱います。
- 税率ごとに小計を集計し、消費税 ＝ 税率別小計 × 税率（小数点以下切り捨て）。
- 合計 ＝ 小計 ＋ 消費税合計。金額計算は整数演算を基本とし、浮動小数点誤差を避けています。

## 注意事項

- 入力データは利用者のブラウザ（LocalStorage）にのみ保存され、外部送信されません。別の端末・ブラウザでは引き継がれません。
- 本ツールが作成する請求書等が法令上の要件を満たすことを保証するものではありません。重要な書類は専門家にご確認ください。
- AdSense等の広告コードは各HTMLの `<head>` 内コメント位置に挿入してください。未設定の場合は広告スペース自体を表示しない構造になっています。

## アイコン / OGP

- `favicon.ico`（ルート）: 16/32/48px マルチアイコン
- `assets/img/favicon.svg`: ベクター形式ファビコン
- `assets/img/favicon-192.png` / `favicon-512.png`: PWA・Android用
- `assets/img/apple-touch-icon.png`: iOSホーム画面用（180x180）
- `assets/img/icon-maskable-512.png`: マスカブルアイコン
- `assets/img/og-image.png`: OGP / Twitterカード用（1200x630）
- `site.webmanifest`: PWAマニフェスト（アイコンとテーマカラー #1d4ed8 を定義）

全ページの `<head>` に相対パスでファビコンリンクを挿入済みです。ヘッダーのロゴにもアイコン画像を使用しています。
