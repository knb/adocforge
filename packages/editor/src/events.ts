export interface AdocForgeChangeDetail {
  value: string
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
    'adocforge-load': CustomEvent<AdocForgePersistenceDetail>
    'adocforge-load-error': CustomEvent<AdocForgePersistenceErrorDetail>
    'adocforge-save': CustomEvent<AdocForgePersistenceDetail>
    'adocforge-save-error': CustomEvent<AdocForgePersistenceErrorDetail>
  }
}
