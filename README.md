# KBMemo AsciiDoc Editor

Pure JavaScript AsciiDoc editor packages built with Asciidoctor.js and CodeMirror 6.

This monorepo contains source editing, live preview, and block-based WYSIWYG components extracted from KBMemo. Host-specific behavior is provided through `HostConfig`, so consumers can use the editor without Rails or KBMemo.

## Packages

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
