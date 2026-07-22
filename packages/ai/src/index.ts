export const ADOCFORGE_AI_VERSION = '0.0.0' as const

export const AI_OPERATIONS = ['rewrite', 'summarize', 'continue'] as const

export type AIOperation = (typeof AI_OPERATIONS)[number]

export interface AIRequest {
  operation: AIOperation
  input: string
  instruction?: string
}

export interface AIResponse {
  replacement: string
}

export interface AIProvider {
  complete(request: AIRequest, signal?: AbortSignal): Promise<AIResponse>
}

export type AdocForgeAIErrorCode =
  'aborted' | 'invalid_request' | 'invalid_response' | 'provider_error'

export class AdocForgeAIError extends Error {
  readonly code: AdocForgeAIErrorCode

  constructor(code: AdocForgeAIErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AdocForgeAIError'
    this.code = code
  }
}

export async function runAIOperation(
  provider: AIProvider,
  request: AIRequest,
  signal?: AbortSignal,
): Promise<AIResponse> {
  validateRequest(request)
  throwIfAborted(signal)

  try {
    const response: unknown = await provider.complete(request, signal)
    throwIfAborted(signal)
    return validateResponse(response)
  } catch (error: unknown) {
    if (error instanceof AdocForgeAIError) throw error
    if (signal?.aborted || isAbortError(error)) {
      throw new AdocForgeAIError('aborted', 'AI operation was cancelled', { cause: error })
    }
    throw new AdocForgeAIError('provider_error', 'AI provider failed', { cause: error })
  }
}

function validateRequest(request: AIRequest): void {
  if (!AI_OPERATIONS.includes(request.operation)) {
    throw new AdocForgeAIError('invalid_request', 'AI operation is not supported')
  }
  if (request.input.trim().length === 0) {
    throw new AdocForgeAIError('invalid_request', 'AI input must not be empty')
  }
  if (request.instruction !== undefined && request.instruction.trim().length === 0) {
    throw new AdocForgeAIError('invalid_request', 'AI instruction must not be blank')
  }
}

function validateResponse(response: unknown): AIResponse {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('replacement' in response) ||
    typeof response.replacement !== 'string' ||
    response.replacement.trim().length === 0
  ) {
    throw new AdocForgeAIError(
      'invalid_response',
      'AI provider returned an empty or invalid replacement',
    )
  }
  return { replacement: response.replacement }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AdocForgeAIError('aborted', 'AI operation was cancelled', { cause: signal.reason })
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
