import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@adocforge/editor/storage/indexeddb',
        replacement: path.resolve(rootDir, '../../packages/editor/src/storage/indexeddb.ts'),
      },
      {
        find: '@adocforge/editor',
        replacement: path.resolve(rootDir, '../../packages/editor/src/index.ts'),
      },
      {
        find: '@adocforge/core',
        replacement: path.resolve(rootDir, '../../packages/core/src/index.ts'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
  },
})
