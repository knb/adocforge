// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AsciiDocProcessor } from '@adocforge/core'

import { ADOC_FORGE_EDITOR_TAG, AdocForgeEditor, registerAdocForgeEditor } from '../src/index.js'

Object.defineProperty(Range.prototype, 'getClientRects', {
  configurable: true,
  value: () => [],
})

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('AdocForgeEditor', () => {
  it('registers idempotently in a supplied registry', () => {
    let registered: CustomElementConstructor | undefined
    const define = vi.fn((_name: string, constructor: CustomElementConstructor) => {
      registered = constructor
    })
    const registry = {
      define,
      get: vi.fn(() => registered),
    } as unknown as CustomElementRegistry

    registerAdocForgeEditor(registry)
    registerAdocForgeEditor(registry)

    expect(define).toHaveBeenCalledOnce()
    expect(registered).toBe(AdocForgeEditor)
  })

  it('creates an accessible CodeMirror editing surface from value', async () => {
    registerAdocForgeEditor()
    const editor = document.createElement(ADOC_FORGE_EDITOR_TAG) as AdocForgeEditor
    editor.label = 'Document source'
    editor.value = '= Trail notes'
    document.body.append(editor)
    await editor.updateComplete

    const content = editor.shadowRoot?.querySelector<HTMLElement>('.cm-content')
    const label = editor.shadowRoot?.querySelector('#editor-label')

    expect(label?.textContent).toBe('Document source')
    expect(content?.getAttribute('aria-labelledby')).toBe('editor-label')
    expect(content?.textContent).toBe('= Trail notes')
  })

  it('synchronizes external values without emitting a user change', async () => {
    registerAdocForgeEditor()
    const editor = document.createElement(ADOC_FORGE_EDITOR_TAG) as AdocForgeEditor
    let changeCount = 0
    editor.addEventListener('adocforge-change', () => changeCount++)
    document.body.append(editor)
    await editor.updateComplete

    editor.value = 'Updated externally'
    await editor.updateComplete

    expect(editor.shadowRoot?.querySelector('.cm-content')?.textContent).toBe('Updated externally')
    expect(changeCount).toBe(0)
  })

  it('debounces preview conversion and sanitizes rendered HTML', async () => {
    vi.useFakeTimers()
    const convert = vi.fn((source: string) =>
      Promise.resolve({
        html: `<script>globalThis.compromised = true</script><h2 onclick="compromised()">${source}</h2>`,
        outline: [
          {
            id: '_latest',
            level: 1,
            title: 'Latest section',
            line: 1,
            children: [],
          },
        ],
        diagnostics: [],
      }),
    )
    registerAdocForgeEditor()
    const editor = document.createElement(ADOC_FORGE_EDITOR_TAG) as AdocForgeEditor
    editor.processor = { convert } satisfies AsciiDocProcessor
    editor.previewDelay = 100
    editor.value = 'First'
    document.body.append(editor)
    await editor.updateComplete

    editor.value = 'Latest'
    await editor.updateComplete
    await vi.advanceTimersByTimeAsync(100)
    await editor.updateComplete

    const preview = editor.shadowRoot?.querySelector('.preview-content')
    expect(convert).toHaveBeenCalledOnce()
    expect(convert).toHaveBeenCalledWith('Latest')
    expect(preview?.querySelector('script')).toBeNull()
    expect(preview?.querySelector('h2')?.hasAttribute('onclick')).toBe(false)
    expect(preview?.textContent).toBe('Latest')
    expect(editor.shadowRoot?.querySelector('.outline-list')?.textContent).toContain(
      'Latest section',
    )
  })
})
