// @vitest-environment node

import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import type { AdocDocument } from '@adocforge/core'

import { createIndexedDbStorage } from '../src/storage/indexeddb.js'

function document(id: string, title: string, updatedAt = '2026-07-01T00:00:00.000Z'): AdocDocument {
  return {
    id,
    title,
    source: `= ${title}`,
    attributes: {},
    revision: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt,
  }
}

describe('IndexedDB storage adapter', () => {
  it('saves, loads, and monotonically increments revisions', async () => {
    const storage = createIndexedDbStorage({
      databaseName: 'save-load',
      indexedDB: new IDBFactory(),
      now: () => new Date('2026-07-22T04:00:00.000Z'),
    })

    await expect(storage.save(document('guide', 'Guide'))).resolves.toEqual({
      revision: 1,
      updatedAt: '2026-07-22T04:00:00.000Z',
    })
    await expect(storage.save(document('guide', 'Updated guide'))).resolves.toEqual({
      revision: 2,
      updatedAt: '2026-07-22T04:00:00.000Z',
    })
    await expect(storage.load('guide')).resolves.toMatchObject({
      title: 'Updated guide',
      revision: 2,
    })
    storage.close()
  })

  it('lists newest documents first and deletes records', async () => {
    let timestamp = 0
    const storage = createIndexedDbStorage({
      databaseName: 'list-delete',
      indexedDB: new IDBFactory(),
      now: () => new Date(timestamp++ === 0 ? '2026-07-20T00:00:00Z' : '2026-07-21T00:00:00Z'),
    })

    await storage.save(document('older', 'Older'))
    await storage.save(document('newer', 'Newer'))

    await expect(storage.list()).resolves.toEqual([
      { id: 'newer', title: 'Newer', updatedAt: '2026-07-21T00:00:00.000Z' },
      { id: 'older', title: 'Older', updatedAt: '2026-07-20T00:00:00.000Z' },
    ])

    await storage.delete('older')
    await expect(storage.load('older')).resolves.toBeNull()
    storage.close()
  })
})
