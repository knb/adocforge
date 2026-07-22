import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { LitElement, css, html } from 'lit'
import type { PropertyValues } from 'lit'

import type { AdocForgeChangeDetail } from './events.js'

export const ADOC_FORGE_EDITOR_TAG = 'adoc-forge-editor' as const

export class AdocForgeEditor extends LitElement {
  static properties = {
    label: { type: String },
    readonly: { type: Boolean, reflect: true },
    value: { type: String },
  }

  static styles = css`
    :host {
      display: block;
      color: var(--adocforge-color, #202124);
      background: var(--adocforge-background, #ffffff);
      font-family: var(--adocforge-ui-font, system-ui, sans-serif);
    }

    .editor-label {
      display: block;
      margin-block-end: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .editor-surface {
      min-block-size: var(--adocforge-editor-min-height, 18rem);
      border: 1px solid var(--adocforge-border-color, #747775);
      border-radius: 4px;
      overflow: auto;
    }

    .editor-surface:focus-within {
      outline: 3px solid var(--adocforge-focus-color, #0b57d0);
      outline-offset: 2px;
    }

    .editor-surface .cm-editor {
      min-block-size: inherit;
    }

    .editor-surface .cm-scroller {
      min-block-size: inherit;
      font-family: var(--adocforge-editor-font, ui-monospace, monospace);
      font-size: 1rem;
      line-height: 1.5;
    }
  `

  declare label: string
  declare readonly: boolean
  declare value: string

  readonly #readonlyCompartment = new Compartment()
  #editorView: EditorView | undefined
  #syncingExternalValue = false

  constructor() {
    super()
    this.label = 'AsciiDoc source'
    this.readonly = false
    this.value = ''
  }

  protected render() {
    return html`
      <span class="editor-label" id="editor-label">${this.label}</span>
      <div class="editor-surface"></div>
    `
  }

  protected firstUpdated(): void {
    const parent = this.renderRoot.querySelector<HTMLElement>('.editor-surface')
    if (!parent) throw new Error('AdocForge editor surface was not rendered')

    this.#editorView = new EditorView({
      parent,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          basicSetup,
          this.#readonlyCompartment.of(this.#readonlyExtensions()),
          EditorView.contentAttributes.of({ 'aria-labelledby': 'editor-label' }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || this.#syncingExternalValue) return

            const value = update.state.doc.toString()
            this.value = value
            this.dispatchEvent(
              new CustomEvent<AdocForgeChangeDetail>('adocforge-change', {
                bubbles: true,
                composed: true,
                detail: { value },
              }),
            )
          }),
        ],
      }),
    })
  }

  protected updated(changed: PropertyValues<this>): void {
    const view = this.#editorView
    if (!view) return

    if (changed.has('value')) {
      const currentValue = view.state.doc.toString()
      if (currentValue !== this.value) {
        this.#syncingExternalValue = true
        try {
          view.dispatch({ changes: { from: 0, to: currentValue.length, insert: this.value } })
        } finally {
          this.#syncingExternalValue = false
        }
      }
    }

    if (changed.has('readonly')) {
      view.dispatch({
        effects: this.#readonlyCompartment.reconfigure(this.#readonlyExtensions()),
      })
    }
  }

  disconnectedCallback(): void {
    this.#editorView?.destroy()
    this.#editorView = undefined
    super.disconnectedCallback()
  }

  focus(options?: FocusOptions): void {
    if (this.#editorView) {
      this.#editorView.focus()
    } else {
      super.focus(options)
    }
  }

  #readonlyExtensions() {
    return [EditorState.readOnly.of(this.readonly), EditorView.editable.of(!this.readonly)]
  }
}

export function registerAdocForgeEditor(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(ADOC_FORGE_EDITOR_TAG)) {
    registry.define(ADOC_FORGE_EDITOR_TAG, AdocForgeEditor)
  }
}
