import { describe, expect, it, vi } from 'vitest'

import {
  AdocForgeAIError,
  runAIOperation,
  streamAIOperation,
  type AIProvider,
  type AIRequest,
  type AIStreamChunk,
} from '../src/index.js'

const rewriteRequest: AIRequest = {
  operation: 'rewrite',
  input: 'Original paragraph.',
  instruction: 'Make it concise.',
}

describe('runAIOperation', () => {
  it('passes the explicit operation and minimal input to the provider', async () => {
    const complete = vi.fn().mockResolvedValue({ replacement: 'Concise paragraph.' })
    const provider = { complete } satisfies AIProvider

    await expect(runAIOperation(provider, rewriteRequest)).resolves.toEqual({
      replacement: 'Concise paragraph.',
    })
    expect(complete).toHaveBeenCalledOnce()
    expect(complete).toHaveBeenCalledWith(rewriteRequest, undefined)
  })

  it.each(['rewrite', 'summarize', 'continue'] as const)(
    'supports the %s operation',
    async (operation) => {
      const provider: AIProvider = {
        complete: vi.fn().mockResolvedValue({ replacement: 'Proposal' }),
      }

      await expect(
        runAIOperation(provider, { operation, input: 'Selected text' }),
      ).resolves.toEqual({
        replacement: 'Proposal',
      })
    },
  )

  it('rejects empty input before calling the provider', async () => {
    const complete = vi.fn().mockResolvedValue({ replacement: 'Unused' })

    await expect(
      runAIOperation({ complete }, { operation: 'summarize', input: '  ' }),
    ).rejects.toMatchObject({ code: 'invalid_request' })
    expect(complete).not.toHaveBeenCalled()
  })

  it('rejects an invalid provider response', async () => {
    const provider = {
      complete: vi.fn().mockResolvedValue({ replacement: '' }),
    } as AIProvider

    await expect(runAIOperation(provider, rewriteRequest)).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })

  it('does not call the provider when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const complete = vi.fn().mockResolvedValue({ replacement: 'Unused' })

    await expect(
      runAIOperation({ complete }, rewriteRequest, controller.signal),
    ).rejects.toMatchObject({
      code: 'aborted',
    })
    expect(complete).not.toHaveBeenCalled()
  })

  it('normalizes provider failures and preserves their cause', async () => {
    const cause = new Error('upstream unavailable')
    const provider: AIProvider = { complete: vi.fn().mockRejectedValue(cause) }

    try {
      await runAIOperation(provider, rewriteRequest)
      throw new Error('Expected runAIOperation to reject')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AdocForgeAIError)
      expect(error).toMatchObject({ code: 'provider_error', cause })
    }
  })
})

describe('streamAIOperation', () => {
  it('yields validated provider chunks in order', async () => {
    const stream = vi.fn(async function* (): AsyncGenerator<AIStreamChunk> {
      await Promise.resolve()
      yield { delta: 'Concise ' }
      yield { delta: 'paragraph.' }
    })
    const complete = vi.fn().mockResolvedValue({ replacement: 'Unused' })
    const provider: AIProvider = {
      complete,
      stream,
    }

    await expect(collect(streamAIOperation(provider, rewriteRequest))).resolves.toBe(
      'Concise paragraph.',
    )
    expect(stream).toHaveBeenCalledWith(rewriteRequest, undefined)
    expect(complete).not.toHaveBeenCalled()
  })

  it('falls back to a single completion chunk', async () => {
    const provider: AIProvider = {
      complete: vi.fn().mockResolvedValue({ replacement: 'Complete proposal' }),
    }

    const chunks: AIStreamChunk[] = []
    for await (const chunk of streamAIOperation(provider, rewriteRequest)) chunks.push(chunk)

    expect(chunks).toEqual([{ delta: 'Complete proposal' }])
  })

  it('rejects an empty stream', async () => {
    const provider: AIProvider = {
      complete: vi.fn().mockResolvedValue({ replacement: 'Unused' }),
      stream: async function* () {
        await Promise.resolve()
        yield { delta: '' }
      },
    }

    await expect(collect(streamAIOperation(provider, rewriteRequest))).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })

  it('stops exposing chunks after cancellation', async () => {
    const controller = new AbortController()
    const provider: AIProvider = {
      complete: vi.fn().mockResolvedValue({ replacement: 'Unused' }),
      stream: async function* () {
        await Promise.resolve()
        yield { delta: 'First' }
        yield { delta: 'Second' }
      },
    }
    const iterator = streamAIOperation(provider, rewriteRequest, controller.signal)

    await expect(iterator.next()).resolves.toEqual({ done: false, value: { delta: 'First' } })
    controller.abort()
    await expect(iterator.next()).rejects.toMatchObject({ code: 'aborted' })
  })
})

async function collect(stream: AsyncIterable<AIStreamChunk>): Promise<string> {
  let result = ''
  for await (const chunk of stream) result += chunk.delta
  return result
}
