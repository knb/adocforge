// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { ADOC_FORGE_EDITOR_TAG, AdocForgeEditor, registerAdocForgeEditor } from '../src/index.js'

afterEach(() => {
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
})
