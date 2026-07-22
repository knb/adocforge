# AdocForge Agent Instructions

## Mission

Build a secure, framework-independent, AI-assisted AsciiDoc editor distributed as npm packages and a Web Component.

## Working Rules

- Read `ADOCFORGE_BOOTSTRAP.md` and relevant ADRs before architectural changes.
- Use pnpm only. Use TypeScript strict mode and ESM for new code.
- Keep `packages/core` independent from DOM, Lit, and CodeMirror.
- Keep `packages/ai` independent from vendor SDKs.
- Do not expose CodeMirror internals as the public editor API.
- Treat AsciiDoc source as canonical data.
- Never send document content to external services unless explicitly configured.
- Add or update tests for every behavior change.
- Update public documentation when public APIs change.
- Record non-trivial architectural decisions under `docs/decisions/`.
- Do not publish packages or push to remotes unless explicitly requested.
- Treat `legacy/` as migration input, not as the target public architecture.

## Required Checks

- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e` when UI behavior changes

## Coding Style

- Prefer small, composable modules.
- Prefer explicit types over `any`.
- Use `AbortSignal` for cancellable asynchronous operations.
- Return structured errors at package boundaries.
- Keep comments focused on why, not what.
