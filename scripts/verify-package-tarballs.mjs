#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

import { ADOCFORGE_WORKSPACES } from './package-workspaces.mjs'

const REQUIRED_PATHS = {
  '@adocforge/core': ['README.adoc', 'dist/index.d.ts', 'dist/index.js', 'package.json'],
  '@adocforge/ai': ['README.adoc', 'dist/index.d.ts', 'dist/index.js', 'package.json'],
  '@adocforge/editor': [
    'README.adoc',
    'dist/index.d.ts',
    'dist/index.js',
    'dist/storage/indexeddb.d.ts',
    'dist/storage/indexeddb.js',
    'package.json',
  ],
}

for (const workspace of ADOCFORGE_WORKSPACES) {
  const output = execFileSync('pnpm', ['--filter', workspace, 'pack', '--dry-run', '--json'], {
    encoding: 'utf8',
  })
  const entry = JSON.parse(output)
  const paths = new Set((entry.files ?? []).map((file) => file.path))

  for (const required of REQUIRED_PATHS[workspace]) {
    if (!paths.has(required)) fail(`${workspace}: missing ${required} in pnpm pack output`)
  }

  const forbidden = [...paths].filter((path) => path.startsWith('src/') || path.startsWith('test/'))
  if (forbidden.length > 0) {
    fail(`${workspace}: source or test files leaked into tarball: ${forbidden.join(', ')}`)
  }

  console.log(`${workspace}: pack ok (${entry.files.length} files)`)
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
