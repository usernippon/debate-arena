# DEBATE ARENA

日本語対応の競技ディベート向けAI Webアプリ。React + Viteの静的フロントエンドをGitHub Pagesに公開し、Cloudflare Workers経由でOpenAI Responses APIを呼び出します。

## 機能
- 賛成・反対の立場選択、テーマ選択・自由入力
- 大会レベルのAI反論（論点要約、反駁、再主張、質問）
- 4段階の進行表示
- 5基準・各20点の最終ジャッジ
- APIキーはCloudflare WorkerのSecretに保持（ブラウザへ公開しない）

## 1. ローカルでフロントエンドを起動

```bash
npm install
cp .env.example .env.local
```

`.env.local` にWorker URLを設定します。

```env
VITE_API_BASE_URL=https://debate-arena-api.<あなたのアカウント>.workers.dev
```

```bash
npm run dev
```

## 2. Cloudflare Workerをデプロイ

```bash
cd worker
npm install -D wrangler
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
```

入力を求められたらOpenAI APIキーを貼り付けます。APIキーをGitHubやフロントエンドの環境変数に保存しないでください。

本番のGitHub Pages URLだけを許可する場合は `worker/wrangler.toml` に `ALLOWED_ORIGIN` を設定するか、CloudflareダッシュボードのWorker Variablesに設定します。例：

```toml
[vars]
OPENAI_MODEL = "gpt-4.1-mini"
ALLOWED_ORIGIN = "https://YOUR_GITHUB_NAME.github.io"
```

プロジェクトページ形式（`https://YOUR_GITHUB_NAME.github.io/REPO/`）でもOriginはドメイン部分のみです。

```bash
npx wrangler deploy
```

デプロイ後の `https://...workers.dev` URLを控えます。

## 3. GitHub Pagesへ公開

### 重要：リポジトリ名を設定
`vite.config.ts` の `base` を、GitHubリポジトリ名に合わせます。

```ts
base: process.env.GITHUB_PAGES === 'true' ? '/REPLACE_WITH_REPO_NAME/' : '/'
```

例えばリポジトリ名が `debate-arena` なら `/debate-arena/` に変更してください。ユーザー名.github.io のユーザーサイトとして公開する場合は `/` にします。

### GitHubへpush
GitHubで空のリポジトリを作り、次を実行します。

```bash
git init
git add .
git commit -m "Initial DEBATE ARENA app"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

GitHubリポジトリの **Settings → Secrets and variables → Actions → Variables** で `VITE_API_BASE_URL` を作成し、Worker URLを設定します。

続いて **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。`main`へpushすると自動デプロイされます。

## 4. ローカルでWorkerを試す

`worker/.dev.vars.example` を `worker/.dev.vars` にコピーし、実際のキーを設定します（`.dev.vars` はGit管理対象外です）。

```bash
cd worker
npx wrangler dev
```

## 注意事項
- OpenAI APIの利用にはAPI課金が発生します。ChatGPTの月額プランとは別です。
- 公開前にCloudflare側でレート制限、利用量上限、Bot対策を追加してください。CORSだけでは不正利用を防げません。
- この初期版は議論ログをサーバーに保存しません。履歴はブラウザのメモリ上のみです。
- 判定はAIによる参考評価であり、公式大会の審判結果を保証するものではありません。
- 本番運用では利用規約・プライバシーポリシー、入力内容の取り扱い、課金上限を整備してください。

## API
- `POST /api/reply` : AIの反論を生成
- `POST /api/judge` : 会話ログを審判基準で採点
