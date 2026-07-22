# AdocForge

AI-assisted, framework-independent AsciiDoc editor packages built with Asciidoctor.js and CodeMirror 6.

The current architecture is implemented in `@adocforge/core`, `@adocforge/ai`, and `@adocforge/editor`. Earlier KBMemo-derived packages remain under `legacy/` as migration inputs and are not the target public API.

See [ADOCFORGE_BOOTSTRAP.md](ADOCFORGE_BOOTSTRAP.md) for the product scope, architecture, implementation phases, and release requirements.

Try the [AdocForge playground](https://knb.github.io/adocforge/) to edit AsciiDoc with syntax highlighting and inspect the live preview in a browser.

Project documentation:

- [Architecture](docs/architecture.adoc)
- [Roadmap](docs/roadmap.adoc)
- [Development guide](docs/development.adoc)
- [API reference and examples](docs/api.adoc)
- [Release runbook](docs/releasing.adoc)
- [Architecture decisions](docs/decisions/)
- [Contributing](CONTRIBUTING.adoc)
- [Security policy](SECURITY.md)

## Target Packages

AdocForge exposes three package entry points:

| Package             | Role                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `@adocforge/core`   | AsciiDoc processing, outline, diagnostics, and persistence interfaces |
| `@adocforge/ai`     | Vendor-independent AI request and response contracts                  |
| `@adocforge/editor` | CodeMirror-based `<adoc-forge-editor>` Web Component                  |

## Capabilities

- Secure Asciidoctor.js conversion with outlines and diagnostics
- CodeMirror 6 source editing with sanitized live preview
- IndexedDB restore and autosave
- `.adoc` import and export
- Provider-independent AI rewrite, summarize, and continue proposals
- Streaming, cancellation, and explicit Accept or Reject

See the [API reference](docs/api.adoc), the [live playground](https://knb.github.io/adocforge/), and its source under `apps/playground` for integration details.

## Legacy Packages

The extracted KBMemo packages remain under `legacy/packages` as tested migration inputs. They are not the target public API.

| Package                   | Role                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| `@kbmemo/adoc-codemirror` | Asciidoctor AST highlighting and edit-unit parsing for CodeMirror 6 |
| `@kbmemo/adoc-preview`    | Live AsciiDoc HTML preview                                          |
| `@kbmemo/adoc-wysiwyg`    | Block-based AsciiDoc WYSIWYG editor                                 |
| `@kbmemo/adoc-kbmemo`     | Host adapters and optional wiki, diagram, and math extensions       |
| `@kbmemo/adoc-editor`     | Umbrella entry point                                                |

## Requirements

- Node.js 20 or later
- `@asciidoctor/core` 4

## Development

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

The CI workflow runs formatting, lint, type, build, test, tarball, isolated-consumer, and playground checks on Node.js 20.

Run the AdocForge playground:

```bash
pnpm --filter @adocforge/playground dev
```

## Install

Install the published packages from npm:

```bash
npm install @adocforge/core @adocforge/ai @adocforge/editor
```

## License

MIT
