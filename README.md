# AdocForge

AI-assisted, framework-independent AsciiDoc editor packages built with Asciidoctor.js and CodeMirror 6.

This repository is being migrated from editor components extracted from KBMemo to the `@adocforge/core`, `@adocforge/ai`, and `@adocforge/editor` package architecture. The existing packages remain operational during that migration.

See [ADOCFORGE_BOOTSTRAP.md](ADOCFORGE_BOOTSTRAP.md) for the product scope, architecture, implementation phases, and release requirements.

Project documentation:

- [Architecture](docs/architecture.adoc)
- [Roadmap](docs/roadmap.adoc)
- [Development guide](docs/development.adoc)
- [Architecture decisions](docs/decisions/)

## Target Packages

AdocForge will expose three public packages:

| Package             | Role                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `@adocforge/core`   | AsciiDoc processing, outline, diagnostics, and persistence interfaces |
| `@adocforge/ai`     | Vendor-independent AI request and response contracts                  |
| `@adocforge/editor` | CodeMirror-based `<adoc-forge-editor>` Web Component                  |

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

The packages are not yet published to npm. After the first release:

```bash
npm install @adocforge/editor
```

## License

MIT
