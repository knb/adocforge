# AdocForge — Codex CLI Bootstrap Specification

## 1. この文書の使い方

この文書は、GitHubで公開するオープンソースの **AI支援付きAsciiDocエディタ「AdocForge」** を、Codex CLIで新規に立ち上げるための実装仕様書兼プロンプトである。

Codex CLIは選択したローカルディレクトリ内のファイルを読み、変更し、コマンドを実行できるため、空のGitリポジトリのルートに本書を配置して作業を開始する。Codex向けの恒常的な指示は、実装開始時に本書からルートの `AGENTS.md` へ要約して作成すること。

推奨ファイル名：

```text
ADOCFORGE_BOOTSTRAP.md
```

起動例：

```bash
mkdir AdocForge
cd AdocForge
git init
cp /path/to/ADOCFORGE_BOOTSTRAP.md .
codex
```

Codex CLIを起動したら、最初に次の指示を与える。

```text
ADOCFORGE_BOOTSTRAP.md を読み、内容を実装計画に変換してください。
最初にリポジトリを調査し、未初期化ならPhase 0から開始してください。
ルートにAGENTS.mdとdocs/architecture.adocを作成した後、Phase 1のMVPを実装してください。
各Phaseで、実装、テスト、ドキュメント更新を完了してから次へ進んでください。
不明点は妥当なデフォルトを採用し、決定事項をdocs/decisions/へADRとして記録してください。
```

---

## 2. プロジェクト概要

### 2.1 名称

- 製品名：**AdocForge**
- GitHubリポジトリ名：`AdocForge`
- npmスコープ候補：`@adocforge`
- Web Component名：`<adoc-forge-editor>`
- CLI名候補：`adocforge`

公開前にGitHub、npm、商標データベースを改めて確認し、名称またはスコープが利用できない場合は、製品名を維持しつつnpmスコープのみ組織名へ変更できる構造にする。

### 2.2 一文での説明

AdocForgeは、CodeMirror 6とネイティブJavaScript版Asciidoctor.jsを基盤とし、AI補完、構造編集、ライブプレビュー、図表、ローカル保存を統合する、フレームワーク非依存のAsciiDocエディタである。

### 2.3 想定ユーザー

- 技術文書をAsciiDocで作成する個人・チーム
- GitHub/GitLab/Giteaで文書を管理する開発者
- Railsなど既存WebアプリへAsciiDoc編集機能を組み込みたい開発者
- OpenAI、llama.cpp、Ollama等のAIを差し替えて使いたい利用者
- オフラインまたはローカルファーストで文書を編集したい利用者

### 2.4 基本原則

1. **AsciiDoc原文を正本とする。** HTML、アウトライン、検索索引は派生データとして扱う。
2. **保存先を固定しない。** IndexedDB、File System Access API、REST API、Git連携をアダプターで差し替えられるようにする。
3. **AIプロバイダーを固定しない。** OpenAI、llama.cpp、Ollama、独自REST APIに対応できる抽象インターフェースを設ける。
4. **フレームワーク非依存を維持する。** コアはDOMやReact/Vueに依存させない。完成エディタはWeb Componentとして提供する。
5. **段階的に高度化する。** 最初から完全なIDEや共同編集を実装しない。
6. **アクセシビリティとキーボード操作を重視する。**
7. **ユーザー文書を勝手に外部送信しない。** AI、Kroki、同期先への送信は明示設定された場合のみ行う。

---

## 3. MVPの範囲

MVPでは、次を実装する。

### 3.1 必須機能

- CodeMirror 6によるAsciiDoc編集
- Asciidoctor.js 4によるHTML変換
- 編集と連動するライブプレビュー
- 500ms前後のdebounce付き変換
- 見出しからアウトライン生成
- 編集・プレビュー・アウトラインの3ペイン表示
- IndexedDBへの自動保存
- `.adoc` ファイルのインポート
- `.adoc` ファイルとしてのエクスポート
- 保存状態表示：`未保存 / 保存中 / 保存済み / 保存失敗`
- 基本的なAI操作：
  - 選択範囲を書き直す
  - 選択範囲を要約する
  - 続きを生成する
- AIは利用者が渡す `AIProvider` 経由のみで呼び出す
- Vanilla JavaScript/Viteのデモアプリ
- Web Componentとしての利用例
- 単体テスト、統合テスト、最低限のE2Eテスト
- GitHub ActionsによるCI
- MIT License
- README、CONTRIBUTING、SECURITY、CODE_OF_CONDUCT

### 3.2 MVPに含めないもの

- リアルタイム共同編集
- CRDT
- GitHubへの直接保存
- PDF生成
- 完全なLanguage Server Protocol対応
- AsciiDoc構文の独自フルパーサー
- WYSIWYG編集
- モバイル専用UI
- 複数ファイルプロジェクト管理
- Krokiサーバーの同梱
- AIエージェントによる自律的なファイル変更

これらは将来のPhaseで扱う。

---

## 4. 技術スタック

### 4.1 必須

- Node.js：Active LTSを使用し、`engines`で下限を明示
- TypeScript：strict mode
- pnpm workspace
- ESMのみ
- Vite
- CodeMirror 6
- Asciidoctor.js 4
- Lit：Web Componentの薄いUIレイヤーとして使用
- Vitest
- Playwright
- ESLint
- Prettier
- Changesets
- GitHub Actions

### 4.2 設計上の制約

- `packages/core` はDOM、Lit、CodeMirrorに依存しない。
- `packages/editor` は `packages/core` と `packages/ai` を利用できる。
- `packages/ai` は特定ベンダーSDKへ直接依存しない。
- 外部AIプロバイダー実装は、MVPではデモアプリ側のREST実装例に留める。
- Asciidoctor.jsの型が不十分な場合、最小限のローカル型定義を追加するが、`any` の濫用は避ける。
- ブラウザへNode.js専用モジュールを混入させない。
- AsciiDoc変換は将来Web Workerへ移せる境界を設ける。

---

## 5. モノレポ構成

最初は3つの公開パッケージに限定する。

```text
AdocForge/
├── AGENTS.md
├── ADOCFORGE_BOOTSTRAP.md
├── README.adoc
├── LICENSE
├── CONTRIBUTING.adoc
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.js
├── .editorconfig
├── .gitignore
├── .npmrc
├── .changeset/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── docs/
│   ├── architecture.adoc
│   ├── roadmap.adoc
│   ├── development.adoc
│   └── decisions/
│       ├── 0001-monorepo-and-pnpm.adoc
│       ├── 0002-codemirror-6.adoc
│       ├── 0003-web-component-api.adoc
│       └── 0004-storage-and-ai-adapters.adoc
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── src/
│   │   └── test/
│   ├── ai/
│   │   ├── package.json
│   │   ├── src/
│   │   └── test/
│   └── editor/
│       ├── package.json
│       ├── src/
│       └── test/
├── apps/
│   └── playground/
│       ├── package.json
│       ├── index.html
│       └── src/
├── examples/
│   ├── vanilla/
│   └── rails/
└── e2e/
```

### 5.1 パッケージ名

```text
@adocforge/core
@adocforge/ai
@adocforge/editor
```

将来、責務が十分大きくなった場合のみ追加する。

```text
@adocforge/codemirror
@adocforge/preview
@adocforge/storage-indexeddb
@adocforge/storage-rest
@adocforge/kroki
@adocforge/cli
```

初期段階での過剰分割は禁止する。

---

## 6. パッケージ責務

### 6.1 `@adocforge/core`

UI非依存の文書処理を担当する。

必須API案：

```ts
export interface AdocDocument {
  id: string
  title: string
  source: string
  attributes: Record<string, string | boolean>
  revision: number
  createdAt: string
  updatedAt: string
}

export interface OutlineItem {
  id: string
  level: number
  title: string
  line: number
  children: OutlineItem[]
}

export interface Diagnostic {
  severity: 'info' | 'warning' | 'error'
  message: string
  line?: number
  column?: number
  source?: string
}

export interface ConversionResult {
  html: string
  outline: OutlineItem[]
  diagnostics: Diagnostic[]
  title?: string
}

export interface AsciiDocProcessor {
  convert(source: string, options?: ConvertOptions): Promise<ConversionResult>
}
```

実装要件：

- Asciidoctor.jsを直接UIから呼ばず、`AsciiDocProcessor`で包む。
- 変換オプションを安全なallowlistとして定義する。
- HTMLはプレビューへ渡す前にサニタイズ可能なフックを用意する。
- `safe` モードをデフォルトにする。
- `include::` や外部URI参照はMVPで無効または明示オプトインとする。
- アウトライン生成はAsciidoctor.jsのDocument ASTを第一候補とする。

### 6.2 `@adocforge/ai`

ベンダー非依存のAI操作を担当する。

```ts
export type AIOperation =
  | 'rewrite'
  | 'summarize'
  | 'continue'
  | 'proofread'
  | 'custom'

export interface AIRequest {
  operation: AIOperation
  instruction?: string
  selectedText?: string
  beforeText?: string
  afterText?: string
  documentTitle?: string
  language?: string
  signal?: AbortSignal
}

export interface AIChunk {
  text: string
  done?: boolean
}

export interface AIProvider {
  complete(request: AIRequest): Promise<string>
  stream?(request: AIRequest): AsyncIterable<AIChunk>
}
```

実装要件：

- APIキーをパッケージ内に保持しない。
- ブラウザへ秘密鍵を埋め込む例を作らない。
- リクエストキャンセルに対応する。
- ストリームの途中キャンセルとエラー表示を実装する。
- 文書全体を無条件にAIへ送らない。選択範囲と必要最小限の前後文脈を基本とする。
- AI出力は自動適用せず、差分確認または明示的なAccept操作を必須とする。

### 6.3 `@adocforge/editor`

完成エディタとWeb Componentを提供する。

主API案：

```ts
export interface StorageAdapter {
  load(id: string): Promise<AdocDocument | null>
  save(document: AdocDocument): Promise<{ revision: number; updatedAt: string }>
  delete(id: string): Promise<void>
  list(): Promise<Array<Pick<AdocDocument, 'id' | 'title' | 'updatedAt'>>>
}

export interface AdocForgeEditorOptions {
  value?: string
  documentId?: string
  storage?: StorageAdapter
  aiProvider?: AIProvider
  autosaveDelay?: number
  readonly?: boolean
  locale?: 'ja' | 'en'
}
```

Web Component例：

```html
<adoc-forge-editor
  document-id="getting-started"
  locale="ja"
></adoc-forge-editor>
```

JavaScript例：

```ts
import '@adocforge/editor'
import { createIndexedDbStorage } from '@adocforge/editor/storage/indexeddb'

const element = document.querySelector('adoc-forge-editor')
element.storage = createIndexedDbStorage({ databaseName: 'adocforge' })
```

実装要件：

- Shadow DOMを利用する。
- CSS Custom Propertiesでテーマを変更可能にする。
- 外部アプリがイベントを購読できる。
- イベント名は接頭辞を付ける。

```text
adocforge-change
adocforge-save
adocforge-save-error
adocforge-ai-start
adocforge-ai-complete
adocforge-ai-error
```

- CodeMirrorのEditorViewを公開APIとして直接漏らさない。
- 高度な統合向けに限定的なescape hatchを用意する場合はexperimental扱いとする。

---

## 7. UI仕様

### 7.1 デスクトップ

```text
┌──────────────────────────────────────────────────────────────┐
│ Toolbar: New Open Save Export | AI | Preview | Settings      │
├──────────────┬─────────────────────────┬─────────────────────┤
│ Outline      │ CodeMirror Editor       │ HTML Preview        │
│              │                         │                     │
│              │                         │                     │
├──────────────┴─────────────────────────┴─────────────────────┤
│ Status: Saved | line/column | words | conversion diagnostics │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 レスポンシブ

- 幅が狭い場合、アウトラインとプレビューはタブ切替にする。
- 編集領域を最優先する。
- MVPではスマートフォン最適化を保証しないが、破綻させない。

### 7.3 AI操作

- 選択範囲のコンテキストメニュー
- ツールバーのAIボタン
- キーボードショートカット
- 結果はCodeMirror上に差分または提案として表示
- `Accept`、`Reject`、`Regenerate`、`Cancel`を提供
- AI処理中も通常編集を可能にするか、対象範囲のみ明確にロックする

### 7.4 プレビュー

- 原則としてiframeを利用し、編集アプリのDOMから隔離する。
- `sandbox`属性を設定する。
- スクリプト実行はデフォルト禁止。
- リンククリック時の挙動を制御する。
- 将来のスクロール同期に備え、見出しやブロックへソース位置属性を付与できる設計にする。

---

## 8. 保存設計

### 8.1 正本

保存する正本はAsciiDocソースである。

```json
{
  "id": "01JEXAMPLE",
  "title": "Getting Started",
  "source": "= Getting Started\n\nWelcome to AdocForge.",
  "attributes": {
    "toc": "left",
    "sectnums": true
  },
  "revision": 1,
  "createdAt": "2026-07-15T00:00:00.000Z",
  "updatedAt": "2026-07-15T00:00:00.000Z"
}
```

### 8.2 MVP保存先

- IndexedDB
- ファイルインポート
- ファイルダウンロード

### 8.3 自動保存

- 既定debounce：1000ms
- 文書変更時にdirtyへ遷移
- 保存中に新しい変更が入った場合は、完了後に再保存
- 同時保存を直列化
- `beforeunload`で未保存を警告
- 保存失敗後もエディタ内容を保持

状態：

```ts
export type SaveState =
  | 'clean'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict'
```

### 8.4 将来のREST同期

MVPでは実装しないが、`revision`による楽観的ロックを前提とする。

---

## 9. AsciiDocとセキュリティ

- プレビューHTMLは信頼済みとはみなさない。
- Asciidoctor.jsのsafe modeを有効にする。
- `include::`、外部画像、外部URI、カスタム拡張はデフォルト無効。
- `javascript:` URLを除去する。
- iframeのsandboxを必要最小限にする。
- AIへ送信する内容をUIで明示する。
- Krokiを追加する際は、図表ソースが外部サーバーへ送信されることを明示する。
- npm公開時はprovenance、2FA、最小権限のGitHub Actionsを採用する。
- 依存関係を必要最小限にし、lockfileをコミットする。

---

## 10. テスト方針

### 10.1 Unit

- core変換ラッパー
- アウトライン生成
- 診断変換
- StorageAdapter
- IndexedDB実装
- AI request builder
- AIキャンセルとエラー処理
- 自動保存状態遷移

### 10.2 Integration

- 入力変更からプレビュー更新まで
- IndexedDB保存と再読込
- AI提案のAccept/Reject
- ファイルインポート/エクスポート
- Web Componentイベント

### 10.3 E2E

最低限、次をPlaywrightで確認する。

1. playgroundを開く。
2. AsciiDocを入力する。
3. プレビューに見出しと強調が表示される。
4. リロード後も文書が復元される。
5. モックAIで選択範囲を書き換え、Acceptできる。
6. `.adoc`をエクスポートできる。

### 10.4 品質ゲート

PRとmainへのpushで以下を実行する。

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

初期カバレッジ目標は、重要ロジックのbranch coverage 70%以上とする。数字だけを目的化せず、保存・AI・変換境界を優先する。

---

## 11. npm公開設計

各公開パッケージは次を満たす。

- ESM
- TypeScript declarations
- `exports` map
- `sideEffects`を正しく設定
- source map
- README
- LICENSE
- repository、bugs、homepageメタデータ
- npm provenanceを利用するrelease workflow

例：

```json
{
  "name": "@adocforge/core",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "engines": {
    "node": ">=22"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.adoc", "LICENSE"],
  "sideEffects": false
}
```

Node.js下限は実装時点のActive LTSを確認して決め、全パッケージで統一する。

---

## 12. GitHub公開要件

### 12.1 リポジトリ設定

- default branch：`main`
- squash merge推奨
- branch protection
- CI必須
- DependabotまたはRenovate
- secret scanning
- push protection
- Discussionsは初期利用者が集まった段階で有効化

### 12.2 Issueラベル

```text
bug
enhancement
documentation
good first issue
help wanted
security
package:core
package:editor
package:ai
area:accessibility
area:asciidoc
area:storage
area:preview
area:ai
```

### 12.3 リリース

- ChangesetsでバージョンとCHANGELOGを管理
- Conventional Commitsを推奨するが、MVPで強制しない
- `0.x`期間は破壊的変更を明記
- npm公開はGitHub Actionsから行う
- publish前にdry runを実施

---

## 13. AGENTS.mdに含める指示

Codexは実装開始時に、ルートへ次の趣旨を含む `AGENTS.md` を作成する。

```md
# AdocForge Agent Instructions

## Mission
Build a secure, framework-agnostic, AI-assisted AsciiDoc editor distributed as npm packages and a Web Component.

## Working rules
- Read ADOCFORGE_BOOTSTRAP.md and relevant ADRs before architectural changes.
- Use pnpm only.
- Use TypeScript strict mode and ESM.
- Keep packages/core independent from DOM, Lit, and CodeMirror.
- Keep packages/ai independent from vendor SDKs.
- Do not expose CodeMirror internals as the public editor API.
- Treat AsciiDoc source as canonical data.
- Never send document content to external services unless explicitly configured.
- Add or update tests for every behavior change.
- Update public documentation when public APIs change.
- Record non-trivial architectural decisions under docs/decisions/.
- Do not publish packages or push to remotes unless explicitly requested.

## Required checks
Run before declaring work complete:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- pnpm e2e when UI behavior changes

## Coding style
- Prefer small, composable modules.
- Prefer explicit types over any.
- Use AbortSignal for cancellable asynchronous operations.
- Return structured errors at package boundaries.
- Keep comments focused on why, not what.
```

サブディレクトリ固有のルールが必要になった場合だけ、追加の `AGENTS.md` を置く。

---

## 14. 実装Phase

### Phase 0 — Repository foundation

完了条件：

- pnpm workspaceが初期化される。
- TypeScript、ESLint、Prettier、Vitest、Playwrightが設定される。
- `AGENTS.md`、README、License、基本ドキュメントが存在する。
- 空の3パッケージとplaygroundがbuildできる。
- GitHub ActionsのCIが定義される。
- ADR 0001〜0004が作成される。

### Phase 1 — Core conversion

完了条件：

- Asciidoctor.js 4をラップした `AsciiDocProcessor` がある。
- 基本文書をHTMLへ変換できる。
- アウトラインを取得できる。
- 診断の基本構造がある。
- safe modeと危険機能のデフォルト無効化がテストされる。

### Phase 2 — Editor and preview

完了条件：

- CodeMirror編集画面がある。
- debounce付きライブプレビューが動く。
- アウトラインが更新される。
- Web Componentとして利用できる。
- playgroundから操作できる。

### Phase 3 — Local persistence

完了条件：

- IndexedDB保存アダプターがある。
- 自動保存と状態表示がある。
- リロード後に復元される。
- `.adoc` import/exportが動く。

### Phase 4 — AI assistance

完了条件：

- `AIProvider`が定義される。
- モックプロバイダーを使うデモがある。
- rewrite、summarize、continueが動く。
- Accept/Reject/Cancelがある。
- 文書全体を無条件送信しないことがテストされる。

### Phase 5 — Public release readiness

完了条件：

- APIドキュメントとexamplesが整う。
- accessibilityの基本確認を行う。
- npm packの内容を検査する。
- Changesetsとrelease workflowが動く。
- `0.1.0`として公開可能な状態になる。
- 実際のnpm publishとGitHub pushは明示指示があるまで行わない。

---

## 15. READMEに示す最終利用イメージ

### 15.1 インストール

```bash
pnpm add @adocforge/editor
```

### 15.2 最小構成

```html
<script type="module">
  import '@adocforge/editor'
</script>

<adoc-forge-editor></adoc-forge-editor>
```

### 15.3 IndexedDB保存

```ts
import '@adocforge/editor'
import { createIndexedDbStorage } from '@adocforge/editor/storage/indexeddb'

const editor = document.querySelector('adoc-forge-editor')
editor.configure({
  documentId: 'example',
  storage: createIndexedDbStorage({ databaseName: 'adocforge-demo' }),
})
```

### 15.4 AIプロバイダー

```ts
const aiProvider = {
  async complete(request) {
    const response = await fetch('/api/adocforge/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: request.signal,
    })

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.text
  },
}

editor.configure({ aiProvider })
```

---

## 16. 将来ロードマップ

MVP後に以下を検討する。

1. Kroki連携
2. Mermaidのローカルレンダリング
3. REST Storage Adapter
4. Rails/Stimulus integration example
5. GitHub/Gitea連携
6. 複数文書とプロジェクト
7. `include::`解決ポリシー
8. xref補完
9. AsciiDoc diagnostics強化
10. Web Worker変換
11. Service Worker/PWA
12. オフライン同期
13. 差分・履歴ビュー
14. AIレビュー、用語統一、構造提案
15. RAG向け意味的チャンク生成
16. Language Server連携
17. デスクトップアプリ化

共同編集は、単一ユーザー向けのデータモデルと保存APIが安定した後に検討する。

---

## 17. Codexへの最終実行指示

以下を順守して作業すること。

1. まずリポジトリ状態を確認する。
2. 本書と既存ファイルに矛盾がある場合、既存実装を尊重し、差異を報告する。
3. 未初期化ならPhase 0から始める。
4. 大きな作業は小さな検証可能単位へ分割する。
5. 各Phaseでテストを先行または同時に追加する。
6. 公開APIを変更したらREADMEと型テストを更新する。
7. セキュリティ境界を弱める変更を行わない。
8. 依存追加前に標準APIまたは既存依存で代替できないか確認する。
9. コマンド失敗を無視しない。原因を修正するか、未解決事項として明記する。
10. 最後に、変更一覧、設計判断、実行したテスト、残課題を報告する。
11. GitHubへのpush、npmへのpublish、外部サービスへのデータ送信は、明示的な指示なしに行わない。

最初の実装目標は「高機能」ではなく、次の一本の利用経路が確実に動くことである。

```text
AsciiDocを入力
  → 安全にHTML変換
  → プレビュー
  → IndexedDBへ自動保存
  → リロード後に復元
  → 選択範囲へモックAI提案
  → ユーザーがAccept
  → .adocとしてエクスポート
```

この縦断機能がテストされ、READMEの手順だけで再現できた時点をMVP完成とする。
