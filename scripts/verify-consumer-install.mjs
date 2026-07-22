#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ADOCFORGE_WORKSPACES } from './package-workspaces.mjs'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const workDir = mkdtempSync(join(tmpdir(), 'adocforge-consumer-'))
const packDir = join(workDir, 'packs')

try {
  execFileSync('pnpm', ['run', 'build:current'], { cwd: rootDir, stdio: 'inherit' })
  mkdirSync(packDir)

  const packed = {}
  for (const workspace of ADOCFORGE_WORKSPACES) {
    const output = execFileSync(
      'pnpm',
      ['--filter', workspace, 'pack', '--pack-destination', packDir, '--json'],
      { cwd: rootDir, encoding: 'utf8' },
    )
    const entry = JSON.parse(output)
    packed[workspace] = `file:${entry.filename}`
    console.log(`${workspace}: packed ${entry.filename}`)
  }

  writeConsumerPackage(packed)
  writeRuntimeSmoke()
  writeTypeSmoke()

  execFileSync('npm', ['install', '--ignore-scripts'], { cwd: workDir, stdio: 'inherit' })
  execFileSync('node', ['smoke.mjs'], { cwd: workDir, stdio: 'inherit' })
  execFileSync('npx', ['tsc', '--noEmit'], { cwd: workDir, stdio: 'inherit' })
  console.log('isolated AdocForge consumer install ok')
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

function writeConsumerPackage(packed) {
  writeFileSync(
    join(workDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'adocforge-consumer-smoke',
        private: true,
        type: 'module',
        dependencies: packed,
        devDependencies: { typescript: '^5.9.3' },
      },
      null,
      2,
    )}\n`,
  )
}

function writeRuntimeSmoke() {
  writeFileSync(
    join(workDir, 'smoke.mjs'),
    `import { createAsciiDocProcessor } from '@adocforge/core'
import { runAIOperation, streamAIOperation } from '@adocforge/ai'
import {
  AdocForgeEditor,
  createExportBlob,
} from './verify-editor-exports.mjs'

const converted = await createAsciiDocProcessor().convert('= Packed document\\n\\n== Section')
if (converted.title !== 'Packed document' || converted.outline.length !== 1) {
  throw new Error('core package conversion failed')
}

const provider = {
  complete: async () => ({ replacement: 'Packed proposal' }),
}
const response = await runAIOperation(provider, { operation: 'rewrite', input: 'Source' })
if (response.replacement !== 'Packed proposal') throw new Error('AI completion failed')

let streamed = ''
for await (const chunk of streamAIOperation(provider, { operation: 'summarize', input: 'Source' })) {
  streamed += chunk.delta
}
if (streamed !== 'Packed proposal') throw new Error('AI stream fallback failed')
if (typeof AdocForgeEditor !== 'function' || typeof createExportBlob !== 'function') {
  throw new Error('editor package exports failed')
}

console.log('runtime package smoke ok')
`,
  )

  writeFileSync(
    join(workDir, 'verify-editor-exports.mjs'),
    `import { AdocForgeEditor } from '@adocforge/editor'
import { createIndexedDbStorage } from '@adocforge/editor/storage/indexeddb'

export { AdocForgeEditor }
export const createExportBlob = AdocForgeEditor.prototype.createExportBlob
if (typeof createIndexedDbStorage !== 'function') throw new Error('IndexedDB subpath export failed')
`,
  )
}

function writeTypeSmoke() {
  writeFileSync(
    join(workDir, 'smoke.ts'),
    `import type { AIProvider, AIRequest } from '@adocforge/ai'
import { runAIOperation } from '@adocforge/ai'
import type { StorageAdapter } from '@adocforge/core'
import { createAsciiDocProcessor } from '@adocforge/core'
import type { AdocForgeEditor } from '@adocforge/editor'
import { createIndexedDbStorage } from '@adocforge/editor/storage/indexeddb'

declare const provider: AIProvider
declare const storage: StorageAdapter
declare const editor: AdocForgeEditor
const request: AIRequest = { operation: 'continue', input: 'Context' }

void runAIOperation(provider, request)
void createAsciiDocProcessor().convert(editor.value)
void storage.load('document')
void createIndexedDbStorage
`,
  )

  writeFileSync(
    join(workDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          lib: ['ES2022', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          strict: true,
          target: 'ES2022',
        },
        include: ['smoke.ts'],
      },
      null,
      2,
    )}\n`,
  )
}
