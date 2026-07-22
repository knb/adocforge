export const ADOCFORGE_AI_VERSION = '0.0.0' as const

export interface AIProvider {
  complete(request: AIRequest, signal?: AbortSignal): Promise<AIResponse>
}

export interface AIRequest {
  instruction: string
  selection: string
}

export interface AIResponse {
  replacement: string
}
