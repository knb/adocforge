export interface AdocForgeChangeDetail {
  value: string
}

declare global {
  interface HTMLElementEventMap {
    'adocforge-change': CustomEvent<AdocForgeChangeDetail>
  }
}
