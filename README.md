# AdocForge

AI-assisted, framework-independent AsciiDoc editor packages built with Asciidoctor.js and CodeMirror 6.

This repository is being migrated from editor components extracted from KBMemo to the `@adocforge/core`, `@adocforge/ai`, and `@adocforge/editor` package architecture. The existing packages remain operational during that migration.

See [ADOCFORGE_BOOTSTRAP.md](ADOCFORGE_BOOTSTRAP.md) for the product scope, architecture, implementation phases, and release requirements.

## Target Packages

AdocForge will expose three public packages:

| Package | Role |
| --- | --- |
| `@adocforge/core` | AsciiDoc processing, outline, diagnostics, and persistence interfaces |
| `@adocforge/ai` | Vendor-independent AI request and response contracts |
| `@adocforge/editor` | CodeMirror-based `<adoc-forge-editor>` Web Component |

## Legacy Packages

The extracted KBMemo packages remain under `legacy/packages` as tested migration inputs. They are not the target public API.

| Package | Role |
| --- | --- |
| `@kbmemo/adoc-codemirror` | Asciidoctor AST highlighting and edit-unit parsing for CodeMirror 6 |
| `@kbmemo/adoc-preview` | Live AsciiDoc HTML preview |
| `@kbmemo/adoc-wysiwyg` | Block-based AsciiDoc WYSIWYG editor |
| `@kbmemo/adoc-kbmemo` | Host adapters and optional wiki, diagram, and math extensions |
| `@kbmemo/adoc-editor` | Umbrella entry point |

## Requirements

- Node.js 20 or later
- `@asciidoctor/core` 4

## Development

```bash
npm install
npm test
npm run build
npm run pack:packages
npm run verify:consumer
```

The CI workflow runs the same build, test, tarball, isolated-consumer, and demo checks on Node.js 20.

Run the standalone demo:

```bash
npm run dev --workspace adoc-editor-demo
```

## Install

The packages are not yet published to npm. After the first release:

```bash
npm install @kbmemo/adoc-editor @asciidoctor/core codemirror highlight.js
```

CSS is exported separately so consumers can choose the required layers:

```js
import '@kbmemo/adoc-wysiwyg/wysiwyg.css'
import '@kbmemo/adoc-wysiwyg/contextMenu.css'
import '@kbmemo/adoc-preview/preview_hljs.css'
```

## License

MIT
