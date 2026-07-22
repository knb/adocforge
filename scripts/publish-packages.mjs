#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ADOCFORGE_PACKAGE_DIRS, ADOCFORGE_WORKSPACES } from './package-workspaces.mjs'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const publish = process.argv.includes('--publish')
const registry = process.env.NPM_PUBLISH_REGISTRY ?? 'https://registry.npmjs.org/'

if (publish && process.env.ADOCFORGE_PUBLISH_APPROVED !== 'yes') {
  console.error('Set ADOCFORGE_PUBLISH_APPROVED=yes for an explicitly approved publish.')
  process.exit(1)
}

execFileSync('pnpm', ['run', 'build:current'], { cwd: rootDir, stdio: 'inherit' })
execFileSync('pnpm', ['run', 'verify:publish'], { cwd: rootDir, stdio: 'inherit' })
execFileSync('pnpm', ['run', 'pack:packages'], { cwd: rootDir, stdio: 'inherit' })
execFileSync('pnpm', ['run', 'verify:consumer'], { cwd: rootDir, stdio: 'inherit' })

for (const workspace of ADOCFORGE_WORKSPACES) {
  const packageJson = JSON.parse(
    readFileSync(join(rootDir, ADOCFORGE_PACKAGE_DIRS[workspace], 'package.json'), 'utf8'),
  )
  if (publish && packageJson.version === '0.0.0') {
    console.error(`${workspace}: refusing to publish placeholder version 0.0.0`)
    process.exit(1)
  }

  const args = ['--filter', workspace, 'publish', '--access', 'public', '--no-git-checks']
  if (publish) {
    args.push('--registry', registry, '--provenance')
  } else {
    args.push('--dry-run')
  }

  console.log(`> pnpm ${args.join(' ')}`)
  execFileSync('pnpm', args, { cwd: rootDir, stdio: 'inherit' })
}

console.log(
  publish
    ? `Published ${ADOCFORGE_WORKSPACES.length} AdocForge packages to ${registry}.`
    : 'AdocForge publish dry-run completed. No package was published.',
)
