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

export interface AIStreamChunk {
  delta: string
}

export interface AIProvider {
  complete(request: AIRequest, signal?: AbortSignal): Promise<AIResponse>
  stream?(request: AIRequest, signal?: AbortSignal): AsyncIterable<AIStreamChunk>
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
    throw normalizeError(error, signal)
  }
}

export async function* streamAIOperation(
  provider: AIProvider,
  request: AIRequest,
  signal?: AbortSignal,
): AsyncGenerator<AIStreamChunk> {
  validateRequest(request)
  throwIfAborted(signal)

  if (!provider.stream) {
    const response = await runAIOperation(provider, request, signal)
    yield { delta: response.replacement }
    return
  }

  let replacement = ''
  try {
    for await (const chunk of provider.stream(request, signal)) {
      throwIfAborted(signal)
      const validated = validateChunk(chunk)
      if (validated.delta.length === 0) continue
      replacement += validated.delta
      yield validated
    }
    throwIfAborted(signal)
    validateResponse({ replacement })
  } catch (error: unknown) {
    throw normalizeError(error, signal)
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

function validateChunk(chunk: unknown): AIStreamChunk {
  if (
    typeof chunk !== 'object' ||
    chunk === null ||
    !('delta' in chunk) ||
    typeof chunk.delta !== 'string'
  ) {
    throw new AdocForgeAIError('invalid_response', 'AI provider returned an invalid stream chunk')
  }
  return { delta: chunk.delta }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AdocForgeAIError('aborted', 'AI operation was cancelled', { cause: signal.reason })
  }
}

function isAbortError(error: unknown): boolean {
  return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError'
}

function normalizeError(error: unknown, signal?: AbortSignal): AdocForgeAIError {
  if (error instanceof AdocForgeAIError) return error
  if (signal?.aborted || isAbortError(error)) {
    return new AdocForgeAIError('aborted', 'AI operation was cancelled', { cause: error })
  }
  return new AdocForgeAIError('provider_error', 'AI provider failed', { cause: error })
}
