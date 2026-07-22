import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createAsciiDocProcessor } from '@adocforge/core'
import type { AsciiDocProcessor, OutlineItem } from '@adocforge/core'
import DOMPurify from 'dompurify'
import { LitElement, css, html } from 'lit'
import type { PropertyValues } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

import type { AdocForgeChangeDetail } from './events.js'

export const ADOC_FORGE_EDITOR_TAG = 'adoc-forge-editor' as const

export class AdocForgeEditor extends LitElement {
  static properties = {
    label: { type: String },
    previewDelay: { type: Number, attribute: 'preview-delay' },
    processor: { attribute: false },
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

    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.8fr);
      gap: 1rem;
      align-items: start;
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

    .reference-pane {
      display: grid;
      gap: 1rem;
      min-inline-size: 0;
    }

    .pane-heading {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
    }

    .outline,
    .preview {
      border-block-start: 1px solid var(--adocforge-divider-color, #c4c7c5);
      padding-block-start: 0.75rem;
    }

    .outline-list,
    .outline-list ol {
      margin: 0;
      padding-inline-start: 1.25rem;
    }

    .outline-list a {
      color: var(--adocforge-link-color, #0b57d0);
    }

    .preview-content {
      min-block-size: var(--adocforge-preview-min-height, 12rem);
      overflow-wrap: anywhere;
    }

    .preview-error {
      color: var(--adocforge-error-color, #b3261e);
    }

    @media (max-width: 48rem) {
      .workspace {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `

  declare label: string
  declare previewDelay: number
  declare processor: AsciiDocProcessor
  declare readonly: boolean
  declare value: string

  readonly #readonlyCompartment = new Compartment()
  #editorView: EditorView | undefined
  #outline: OutlineItem[] = []
  #previewError = ''
  #previewGeneration = 0
  #previewHtml = ''
  #previewTimer: ReturnType<typeof setTimeout> | undefined
  #syncingExternalValue = false

  constructor() {
    super()
    this.label = 'AsciiDoc source'
    this.previewDelay = 300
    this.processor = createAsciiDocProcessor()
    this.readonly = false
    this.value = ''
  }

  protected render() {
    return html`
      <div class="workspace">
        <div>
          <span class="editor-label" id="editor-label">${this.label}</span>
          <div class="editor-surface"></div>
        </div>
        <aside class="reference-pane" aria-label="Document reference">
          <nav class="outline" aria-labelledby="outline-heading">
            <h2 class="pane-heading" id="outline-heading">Outline</h2>
            ${this.#renderOutline(this.#outline)}
          </nav>
          <section class="preview" aria-labelledby="preview-heading">
            <h2 class="pane-heading" id="preview-heading">Preview</h2>
            ${
              this.#previewError
                ? html`<p class="preview-error" role="alert">${this.#previewError}</p>`
                : html`<div class="preview-content">${unsafeHTML(this.#previewHtml)}</div>`
            }
          </section>
        </aside>
      </div>
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
    this.#schedulePreview()
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

    if (changed.has('value')) this.#schedulePreview()
    if (changed.has('processor') || changed.has('previewDelay')) this.#schedulePreview()
  }

  disconnectedCallback(): void {
    if (this.#previewTimer !== undefined) clearTimeout(this.#previewTimer)
    this.#previewGeneration++
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

  #renderOutline(items: OutlineItem[]): unknown {
    if (items.length === 0) return html`<p>No sections</p>`

    return html`<ol class="outline-list">
      ${items.map(
        (item) =>
          html`<li>
            <span>${item.title}</span>
            ${item.children.length > 0 ? this.#renderOutline(item.children) : null}
          </li>`,
      )}
    </ol>`
  }

  #schedulePreview(): void {
    if (!this.isConnected) return
    if (this.#previewTimer !== undefined) clearTimeout(this.#previewTimer)

    const generation = ++this.#previewGeneration
    const source = this.value
    this.#previewTimer = setTimeout(
      () => {
        this.#previewTimer = undefined
        void this.#updatePreview(source, generation)
      },
      Math.max(0, this.previewDelay),
    )
  }

  async #updatePreview(source: string, generation: number): Promise<void> {
    try {
      const result = await this.processor.convert(source)
      if (generation !== this.#previewGeneration || !this.isConnected) return

      this.#previewHtml = DOMPurify.sanitize(result.html, { USE_PROFILES: { html: true } })
      this.#outline = result.outline
      this.#previewError = ''
    } catch (error: unknown) {
      if (generation !== this.#previewGeneration || !this.isConnected) return

      this.#previewHtml = ''
      this.#outline = []
      this.#previewError = error instanceof Error ? error.message : 'Preview conversion failed'
    }
    this.requestUpdate()
  }
}

export function registerAdocForgeEditor(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(ADOC_FORGE_EDITOR_TAG)) {
    registry.define(ADOC_FORGE_EDITOR_TAG, AdocForgeEditor)
  }
}
