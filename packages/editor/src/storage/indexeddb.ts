import type { AdocDocument, DocumentSummary, SaveResult, StorageAdapter } from '@adocforge/core'

const DEFAULT_DATABASE_NAME = 'adocforge'
const DEFAULT_STORE_NAME = 'documents'
const DATABASE_VERSION = 1

export interface IndexedDbStorageOptions {
  databaseName?: string
  storeName?: string
  indexedDB?: IDBFactory
  now?: () => Date
}

export interface IndexedDbStorageAdapter extends StorageAdapter {
  close(): void
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed')),
      { once: true },
    )
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('IndexedDB transaction aborted')),
      { once: true },
    )
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('IndexedDB transaction failed')),
      { once: true },
    )
  })
}

function isAdocDocument(value: unknown): value is AdocDocument {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Partial<Record<keyof AdocDocument, unknown>>
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.source === 'string' &&
    typeof record.attributes === 'object' &&
    record.attributes !== null &&
    typeof record.revision === 'number' &&
    Number.isInteger(record.revision) &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  )
}

function requireDocument(value: unknown): AdocDocument {
  if (!isAdocDocument(value)) throw new Error('IndexedDB contains an invalid document record')
  return value
}

class DefaultIndexedDbStorage implements IndexedDbStorageAdapter {
  readonly #databaseName: string
  readonly #factory: IDBFactory
  readonly #now: () => Date
  readonly #storeName: string
  #database: IDBDatabase | undefined
  #opening: Promise<IDBDatabase> | undefined

  constructor(options: IndexedDbStorageOptions) {
    this.#databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME
    this.#factory = options.indexedDB ?? globalThis.indexedDB
    this.#now = options.now ?? (() => new Date())
    this.#storeName = options.storeName ?? DEFAULT_STORE_NAME
  }

  async load(id: string): Promise<AdocDocument | null> {
    const database = await this.#open()
    const transaction = database.transaction(this.#storeName, 'readonly')
    const completion = transactionComplete(transaction)
    const record: unknown = await requestResult(transaction.objectStore(this.#storeName).get(id))
    await completion
    return record === undefined ? null : requireDocument(record)
  }

  async save(document: AdocDocument): Promise<SaveResult> {
    const database = await this.#open()
    const transaction = database.transaction(this.#storeName, 'readwrite')
    const completion = transactionComplete(transaction)
    const store = transaction.objectStore(this.#storeName)
    const stored: unknown = await requestResult(store.get(document.id))
    const existing = stored === undefined ? undefined : requireDocument(stored)
    const revision = Math.max(existing?.revision ?? 0, document.revision) + 1
    const updatedAt = this.#now().toISOString()
    const persisted: AdocDocument = {
      ...document,
      createdAt: existing?.createdAt ?? document.createdAt,
      revision,
      updatedAt,
    }

    await requestResult(store.put(persisted))
    await completion
    return { revision, updatedAt }
  }

  async delete(id: string): Promise<void> {
    const database = await this.#open()
    const transaction = database.transaction(this.#storeName, 'readwrite')
    const completion = transactionComplete(transaction)
    await requestResult(transaction.objectStore(this.#storeName).delete(id))
    await completion
  }

  async list(): Promise<DocumentSummary[]> {
    const database = await this.#open()
    const transaction = database.transaction(this.#storeName, 'readonly')
    const completion = transactionComplete(transaction)
    const stored: unknown = await requestResult(transaction.objectStore(this.#storeName).getAll())
    await completion
    if (!Array.isArray(stored)) throw new Error('IndexedDB returned an invalid document list')
    const records = stored.map(requireDocument)

    return records
      .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  close(): void {
    this.#database?.close()
    this.#database = undefined
    this.#opening = undefined
  }

  async #open(): Promise<IDBDatabase> {
    if (this.#database) return this.#database
    if (this.#opening) return this.#opening

    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.#factory.open(this.#databaseName, DATABASE_VERSION)
      request.addEventListener('upgradeneeded', () => {
        if (!request.result.objectStoreNames.contains(this.#storeName)) {
          request.result.createObjectStore(this.#storeName, { keyPath: 'id' })
        }
      })
      request.addEventListener(
        'success',
        () => {
          this.#database = request.result
          this.#database.addEventListener('versionchange', () => this.close())
          resolve(request.result)
        },
        { once: true },
      )
      request.addEventListener(
        'blocked',
        () => reject(new Error(`IndexedDB database "${this.#databaseName}" is blocked`)),
        { once: true },
      )
      request.addEventListener(
        'error',
        () => reject(request.error ?? new Error('IndexedDB database could not be opened')),
        { once: true },
      )
    }).catch((error: unknown) => {
      this.#opening = undefined
      throw error
    })

    this.#opening = opening
    return opening
  }
}

export function createIndexedDbStorage(
  options: IndexedDbStorageOptions = {},
): IndexedDbStorageAdapter {
  if (!options.indexedDB && !globalThis.indexedDB) {
    throw new Error('IndexedDB is not available in this environment')
  }
  return new DefaultIndexedDbStorage(options)
}
