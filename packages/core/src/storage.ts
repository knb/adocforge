export interface AdocDocument {
  id: string
  title: string
  source: string
  attributes: Record<string, string | boolean>
  revision: number
  createdAt: string
  updatedAt: string
}

export type DocumentSummary = Pick<AdocDocument, 'id' | 'title' | 'updatedAt'>

export interface SaveResult {
  revision: number
  updatedAt: string
}

export interface StorageAdapter {
  load(id: string): Promise<AdocDocument | null>
  save(document: AdocDocument): Promise<SaveResult>
  delete(id: string): Promise<void>
  list(): Promise<DocumentSummary[]>
}
