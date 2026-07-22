import type { AIOperation } from '@adocforge/ai'

export interface AdocForgeChangeDetail {
  value: string
}

export interface AdocForgeAIRequestDetail {
  operation: AIOperation
  input: string
  instruction?: string
}

export interface AdocForgeAIProposalDetail extends AdocForgeAIRequestDetail {
  replacement: string
}

export interface AdocForgeAIErrorDetail {
  operation: AIOperation
  error: unknown
}

export interface AdocForgeAIDecisionDetail extends AdocForgeAIProposalDetail {
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
    'adocforge-ai-accept': CustomEvent<AdocForgeAIDecisionDetail>
    'adocforge-ai-cancel': CustomEvent<AdocForgeAIRequestDetail>
    'adocforge-ai-error': CustomEvent<AdocForgeAIErrorDetail>
    'adocforge-ai-proposal': CustomEvent<AdocForgeAIProposalDetail>
    'adocforge-ai-reject': CustomEvent<AdocForgeAIProposalDetail>
    'adocforge-ai-start': CustomEvent<AdocForgeAIRequestDetail>
    'adocforge-change': CustomEvent<AdocForgeChangeDetail>
    'adocforge-import': CustomEvent<AdocForgeImportDetail>
    'adocforge-import-error': CustomEvent<AdocForgeImportErrorDetail>
    'adocforge-load': CustomEvent<AdocForgePersistenceDetail>
    'adocforge-load-error': CustomEvent<AdocForgePersistenceErrorDetail>
    'adocforge-save': CustomEvent<AdocForgePersistenceDetail>
    'adocforge-save-error': CustomEvent<AdocForgePersistenceErrorDetail>
  }
}
