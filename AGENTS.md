# Agent guide

This repository is the public source of truth for the `@kbmemo/adoc-*` npm packages. KBMemo is a consumer; do not make package changes only in the Rails application.

## Boundaries

- Keep the packages framework-independent and browser-first.
- `@asciidoctor/core` and CodeMirror packages remain peer dependencies and must not be bundled.
- Put KBMemo-specific behavior behind `HostConfig` in `@kbmemo/adoc-kbmemo`.
- AsciiDoc source is the editing source of truth. Do not reconstruct WYSIWYG source from rendered HTML.
- Preserve Trusted Types and sanitization boundaries when rendering preview HTML.

## Verification

- `npm test`
- `npm run build`
- `npm run pack:packages`
- `npm run verify:consumer`
- `npm run verify:publish`

Run all relevant checks before publishing. Test tarballs in an isolated consumer rather than relying only on workspace links.
