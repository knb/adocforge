#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ADOCFORGE_PACKAGE_DIRS, ADOCFORGE_WORKSPACES } from './package-workspaces.mjs'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryUrl = 'git+https://github.com/knb/adocforge.git'
let failed = false

for (const workspace of ADOCFORGE_WORKSPACES) {
  const directory = ADOCFORGE_PACKAGE_DIRS[workspace]
  const path = join(rootDir, directory, 'package.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))

  requireValue(json.name === workspace, workspace, `name must be ${workspace}`)
  requireValue(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(json.version),
    workspace,
    'invalid version',
  )
  requireValue(!json.private, workspace, 'package must not be private')
  requireValue(json.description?.trim(), workspace, 'missing description')
  requireValue(json.license === 'MIT', workspace, 'license must be MIT')
  requireValue(json.repository?.url === repositoryUrl, workspace, 'incorrect repository.url')
  requireValue(
    json.repository?.directory === directory,
    workspace,
    'incorrect repository.directory',
  )
  requireValue(json.publishConfig?.access === 'public', workspace, 'publish access must be public')
  requireValue(json.files?.includes('dist'), workspace, 'files must include dist')

  for (const target of exportTargets(json.exports)) {
    requireValue(
      existsSync(join(rootDir, directory, target)),
      workspace,
      `missing export target ${target}`,
    )
  }

  for (const [name, version] of Object.entries(json.dependencies ?? {})) {
    if (!name.startsWith('@adocforge/')) continue
    requireValue(
      version === 'workspace:*',
      workspace,
      `${name} must use workspace:* (got ${version})`,
    )
  }

  console.log(`${workspace}: publish metadata and exports ok (${json.version})`)
}

if (failed) process.exit(1)
console.log(
  `All ${ADOCFORGE_WORKSPACES.length} AdocForge packages passed publish readiness checks.`,
)

function exportTargets(exports) {
  return Object.values(exports ?? {}).flatMap((entry) =>
    typeof entry === 'string' ? [entry] : Object.values(entry),
  )
}

function requireValue(value, workspace, message) {
  if (value) return
  console.error(`${workspace}: ${message}`)
  failed = true
}
