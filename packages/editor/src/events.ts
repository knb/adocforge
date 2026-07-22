export interface AdocForgeChangeDetail {
  value: string
}

export interface AdocForgeImportDetail {
  name: string
  size: number
  value: string
}

export interface AdocForgeImportErrorDetail {
  error: unknown
}

export interface AdocForgePersistenceDetail {
  documentId: string
  revision: number
  updatedAt: string
}

export interface AdocForgePersistenceErrorDetail {
  documentId: string
  error: unknown
}

declare global {
  interface HTMLElementEventMap {
    'adocforge-change': CustomEvent<AdocForgeChangeDetail>
    'adocforge-import': CustomEvent<AdocForgeImportDetail>
    'adocforge-import-error': CustomEvent<AdocForgeImportErrorDetail>
    'adocforge-load': CustomEvent<AdocForgePersistenceDetail>
    'adocforge-load-error': CustomEvent<AdocForgePersistenceErrorDetail>
    'adocforge-save': CustomEvent<AdocForgePersistenceDetail>
    'adocforge-save-error': CustomEvent<AdocForgePersistenceErrorDetail>
  }
}
