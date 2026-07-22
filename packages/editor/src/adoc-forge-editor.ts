import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { streamAIOperation } from '@adocforge/ai'
import type { AIOperation, AIProvider } from '@adocforge/ai'
import { createAsciiDocProcessor } from '@adocforge/core'
import type { AdocDocument, AsciiDocProcessor, OutlineItem, StorageAdapter } from '@adocforge/core'
import DOMPurify from 'dompurify'
import { LitElement, css, html } from 'lit'
import type { PropertyValues } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import {
  Check,
  createElement,
  Download,
  Import as ImportIcon,
  ListCollapse,
  TextCursorInput,
  WandSparkles,
  X,
} from 'lucide'

import type {
  AdocForgeAIDecisionDetail,
  AdocForgeAIErrorDetail,
  AdocForgeAIProposalDetail,
  AdocForgeAIRequestDetail,
  AdocForgeChangeDetail,
  AdocForgeImportDetail,
  AdocForgeImportErrorDetail,
  AdocForgePersistenceDetail,
  AdocForgePersistenceErrorDetail,
} from './events.js'
import { asciidocLanguage } from './asciidoc-language.js'

type SaveStatus = 'idle' | 'loading' | 'unsaved' | 'saving' | 'saved' | 'error'
type AIStatus = 'idle' | 'running' | 'proposal' | 'error'

interface AIProposal {
  from: number
  input: string
  instruction?: string
  operation: AIOperation
  replacement: string
  source: string
  to: number
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const ASCIIDOC_MIME_TYPE = 'text/asciidoc;charset=utf-8'

export const ADOC_FORGE_EDITOR_TAG = 'adoc-forge-editor' as const

export class AdocForgeEditor extends LitElement {
  static properties = {
    aiProvider: { attribute: false },
    autosaveDelay: { type: Number, attribute: 'autosave-delay' },
    documentId: { type: String, attribute: 'document-id' },
    label: { type: String },
    previewDelay: { type: Number, attribute: 'preview-delay' },
    processor: { attribute: false },
    readonly: { type: Boolean, reflect: true },
    storage: { attribute: false },
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

    .editor-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }

    .editor-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-block-end: 0.5rem;
    }

    .editor-action {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-block-size: 2.25rem;
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--adocforge-border-color, #747775);
      border-radius: 4px;
      color: inherit;
      background: transparent;
      font: inherit;
      cursor: pointer;
    }

    .editor-action:hover {
      background: var(--adocforge-action-hover-background, #f1f3f4);
    }

    .editor-action:focus-visible {
      outline: 3px solid var(--adocforge-focus-color, #0b57d0);
      outline-offset: 2px;
    }

    .editor-action[disabled] {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .editor-action-icon {
      display: inline-flex;
      inline-size: 1rem;
      block-size: 1rem;
    }

    .editor-action-icon svg {
      inline-size: 100%;
      block-size: 100%;
    }

    .file-input {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .file-error {
      margin: 0 0 0.5rem;
      color: var(--adocforge-error-color, #b3261e);
      font-size: 0.8125rem;
    }

    .ai-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-block: 0.5rem;
      padding-block-start: 0.5rem;
      border-block-start: 1px solid var(--adocforge-divider-color, #c4c7c5);
    }

    .ai-result {
      margin-block-start: 0.75rem;
      padding-block-start: 0.75rem;
      border-block-start: 1px solid var(--adocforge-divider-color, #c4c7c5);
    }

    .ai-result-heading {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
    }

    .ai-result-output {
      max-block-size: 16rem;
      margin: 0;
      padding: 0.75rem;
      overflow: auto;
      border: 1px solid var(--adocforge-border-color, #747775);
      border-radius: 4px;
      background: var(--adocforge-proposal-background, #f8f9fa);
      font-family: var(--adocforge-editor-font, ui-monospace, monospace);
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .ai-result-status,
    .ai-stale {
      margin: 0 0 0.5rem;
      color: var(--adocforge-muted-color, #5f6368);
      font-size: 0.8125rem;
    }

    .ai-error,
    .ai-stale {
      color: var(--adocforge-error-color, #b3261e);
    }

    .save-status {
      color: var(--adocforge-muted-color, #5f6368);
      font-size: 0.8125rem;
      white-space: nowrap;
    }

    .save-status[data-status='error'] {
      color: var(--adocforge-error-color, #b3261e);
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

  declare autosaveDelay: number
  declare aiProvider: AIProvider | undefined
  declare documentId: string
  declare label: string
  declare previewDelay: number
  declare processor: AsciiDocProcessor
  declare readonly: boolean
  declare storage: StorageAdapter | undefined
  declare value: string

  readonly #readonlyCompartment = new Compartment()
  #aiAbortController: AbortController | undefined
  #aiError = ''
  #aiGeneration = 0
  #aiOutput = ''
  #aiProposal: AIProposal | undefined
  #aiRequest: AdocForgeAIRequestDetail | undefined
  #aiStatus: AIStatus = 'idle'
  #documentCreatedAt = ''
  #documentRevision = 0
  #documentTitle = ''
  #documentUpdatedAt = ''
  #editVersion = 0
  #editorView: EditorView | undefined
  #fileError = ''
  #outline: OutlineItem[] = []
  #previewError = ''
  #previewGeneration = 0
  #previewHtml = ''
  #previewTimer: ReturnType<typeof setTimeout> | undefined
  #restoreGeneration = 0
  #saveInFlight: Promise<void> | undefined
  #savePending = false
  #saveStatus: SaveStatus = 'idle'
  #saveTimer: ReturnType<typeof setTimeout> | undefined
  #syncingExternalValue = false

  constructor() {
    super()
    this.aiProvider = undefined
    this.autosaveDelay = 1000
    this.documentId = ''
    this.label = 'AsciiDoc source'
    this.previewDelay = 300
    this.processor = createAsciiDocProcessor()
    this.readonly = false
    this.storage = undefined
    this.value = ''
  }

  protected render() {
    return html`
      <div class="workspace">
        <div>
          <div class="editor-heading">
            <span class="editor-label" id="editor-label">${this.label}</span>
            ${
              this.storage && this.documentId
                ? html`<span
                    class="save-status"
                    data-status=${this.#saveStatus}
                    role=${this.#saveStatus === 'error' ? 'alert' : null}
                    >${this.#saveStatusText()}</span
                  >`
                : null
            }
          </div>
          <div class="editor-actions" aria-label="Document actions">
            <button
              class="editor-action import-action"
              type="button"
              ?disabled=${this.readonly}
              @click=${this.#chooseImport}
            >
              <span class="editor-action-icon import-icon" aria-hidden="true"></span>
              <span>Import</span>
            </button>
            <button
              class="editor-action export-action"
              type="button"
              ?disabled=${this.value.length === 0}
              @click=${this.#downloadFromToolbar}
            >
              <span class="editor-action-icon export-icon" aria-hidden="true"></span>
              <span>Export</span>
            </button>
            <input
              class="file-input"
              type="file"
              accept=".adoc,.asciidoc,text/asciidoc,text/plain"
              tabindex="-1"
              aria-hidden="true"
              @change=${this.#handleFileSelection}
            />
          </div>
          ${this.#fileError ? html`<p class="file-error" role="alert">${this.#fileError}</p>` : null}
          <div class="editor-surface"></div>
          ${this.aiProvider ? this.#renderAIActions() : null} ${this.#renderAIResult()}
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
    this.#renderActionIcons()
    const parent = this.renderRoot.querySelector<HTMLElement>('.editor-surface')
    if (!parent) throw new Error('AdocForge editor surface was not rendered')

    this.#editorView = new EditorView({
      parent,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          basicSetup,
          asciidocLanguage,
          this.#readonlyCompartment.of(this.#readonlyExtensions()),
          EditorView.contentAttributes.of({ 'aria-labelledby': 'editor-label' }),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) this.requestUpdate()
            if (!update.docChanged || this.#syncingExternalValue) return

            this.#commitUserValue(update.state.doc.toString())
          }),
        ],
      }),
    })
    this.#schedulePreview()
  }

  protected updated(changed: PropertyValues<this>): void {
    this.#renderActionIcons()
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
    if (changed.has('storage') || changed.has('documentId')) {
      queueMicrotask(() => void this.#restoreDocument())
    }
  }

  disconnectedCallback(): void {
    this.#aiGeneration++
    this.#aiAbortController?.abort()
    this.#aiAbortController = undefined
    if (this.#previewTimer !== undefined) clearTimeout(this.#previewTimer)
    if (this.#saveTimer !== undefined) clearTimeout(this.#saveTimer)
    this.#previewGeneration++
    this.#restoreGeneration++
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

  async importDocument(file: Blob & { name?: string }): Promise<void> {
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error('AsciiDoc files must be 10 MiB or smaller')
      }

      const value = await file.text()
      if (value.includes('\0')) throw new Error('Binary files cannot be imported as AsciiDoc')

      this.#fileError = ''
      this.#commitUserValue(value)
      this.dispatchEvent(
        new CustomEvent<AdocForgeImportDetail>('adocforge-import', {
          bubbles: true,
          composed: true,
          detail: { name: file.name ?? '', size: file.size, value },
        }),
      )
    } catch (error: unknown) {
      this.#fileError = error instanceof Error ? error.message : 'AsciiDoc import failed'
      this.dispatchEvent(
        new CustomEvent<AdocForgeImportErrorDetail>('adocforge-import-error', {
          bubbles: true,
          composed: true,
          detail: { error },
        }),
      )
      this.requestUpdate()
      throw error
    }
  }

  createExportBlob(): Blob {
    return new Blob([this.value], { type: ASCIIDOC_MIME_TYPE })
  }

  downloadDocument(filename = this.#defaultFilename()): void {
    const url = URL.createObjectURL(this.createExportBlob())
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = this.#normalizeFilename(filename)
    anchor.hidden = true
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async requestAI(operation: AIOperation, instruction?: string): Promise<void> {
    const provider = this.aiProvider
    const view = this.#editorView
    if (!provider) throw new Error('AI provider is not configured')
    if (!view) throw new Error('Editor is not ready')
    if (this.#aiStatus === 'running' || this.#aiStatus === 'proposal') {
      throw new Error('Resolve the current AI operation before starting another')
    }

    const selection = view.state.selection.main
    const input = view.state.doc.sliceString(selection.from, selection.to)
    if (input.trim().length === 0) {
      const error = new Error('Select text before using an AI operation')
      this.#setAIError(operation, error)
      throw error
    }

    const request: AdocForgeAIRequestDetail =
      instruction === undefined ? { operation, input } : { operation, input, instruction }
    const generation = ++this.#aiGeneration
    const controller = new AbortController()
    this.#aiAbortController = controller
    this.#aiError = ''
    this.#aiOutput = ''
    this.#aiProposal = undefined
    this.#aiRequest = request
    this.#aiStatus = 'running'
    this.#dispatchAIEvent('adocforge-ai-start', request)
    this.requestUpdate()

    try {
      for await (const chunk of streamAIOperation(provider, request, controller.signal)) {
        if (generation !== this.#aiGeneration) return
        this.#aiOutput += chunk.delta
        this.requestUpdate()
      }
      if (generation !== this.#aiGeneration) return

      this.#aiProposal = {
        from: selection.from,
        input,
        operation,
        replacement: this.#aiOutput,
        source: view.state.doc.toString(),
        to: selection.to,
        ...(instruction === undefined ? {} : { instruction }),
      }
      this.#aiStatus = 'proposal'
      this.#dispatchAIEvent('adocforge-ai-proposal', this.#proposalDetail(this.#aiProposal))
      this.requestUpdate()
    } catch (error: unknown) {
      if (generation !== this.#aiGeneration) return
      this.#setAIError(operation, error)
      throw error
    } finally {
      if (generation === this.#aiGeneration) this.#aiAbortController = undefined
    }
  }

  cancelAI(): void {
    if (this.#aiStatus !== 'running' || !this.#aiRequest) return
    const request = this.#aiRequest
    this.#aiGeneration++
    this.#aiAbortController?.abort()
    this.#resetAIState()
    this.#dispatchAIEvent('adocforge-ai-cancel', request)
  }

  acceptAIProposal(): void {
    const proposal = this.#aiProposal
    const view = this.#editorView
    if (!proposal || !view) return
    if (this.#isAIProposalStale()) throw new Error('AI proposal is stale')

    const detail = this.#proposalDetail(proposal)
    this.#resetAIState()
    view.dispatch({
      changes: { from: proposal.from, to: proposal.to, insert: proposal.replacement },
      selection: { anchor: proposal.from + proposal.replacement.length },
    })
    this.#dispatchAIEvent<AdocForgeAIDecisionDetail>('adocforge-ai-accept', {
      ...detail,
      value: view.state.doc.toString(),
    })
  }

  rejectAIProposal(): void {
    const proposal = this.#aiProposal
    if (!proposal) return
    const detail = this.#proposalDetail(proposal)
    this.#resetAIState()
    this.#dispatchAIEvent('adocforge-ai-reject', detail)
  }

  #commitUserValue(value: string): void {
    this.value = value
    this.#editVersion++
    this.#saveStatus = 'unsaved'
    this.#scheduleSave()
    this.dispatchEvent(
      new CustomEvent<AdocForgeChangeDetail>('adocforge-change', {
        bubbles: true,
        composed: true,
        detail: { value },
      }),
    )
  }

  #chooseImport(): void {
    this.renderRoot.querySelector<HTMLInputElement>('.file-input')?.click()
  }

  async #handleFileSelection(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    try {
      await this.importDocument(file)
    } catch {
      // importDocument exposes failure through visible state and an event.
    }
  }

  #downloadFromToolbar(): void {
    this.downloadDocument()
  }

  #renderActionIcons(): void {
    const icons = [
      ['.import-icon', ImportIcon],
      ['.export-icon', Download],
      ['.rewrite-icon', WandSparkles],
      ['.summarize-icon', ListCollapse],
      ['.continue-icon', TextCursorInput],
      ['.cancel-ai-icon', X],
      ['.accept-ai-icon', Check],
      ['.reject-ai-icon', X],
    ] as const
    for (const [selector, icon] of icons) {
      const container = this.renderRoot.querySelector(selector)
      if (container && container.childElementCount === 0) {
        container.append(createElement(icon, { 'stroke-width': 2 }))
      }
    }
  }

  #defaultFilename(): string {
    return this.documentId || this.#documentTitle || this.#titleFromSource(this.value)
  }

  #normalizeFilename(filename: string): string {
    const trimmed = filename.trim() || 'document'
    return /\.(?:adoc|asciidoc)$/i.test(trimmed) ? trimmed : `${trimmed}.adoc`
  }

  #renderAIActions(): unknown {
    const disabled =
      this.readonly ||
      !this.#hasSelection() ||
      this.#aiStatus === 'running' ||
      this.#aiStatus === 'proposal'
    return html`<div class="ai-actions" aria-label="AI actions">
      <button
        class="editor-action rewrite-action"
        type="button"
        ?disabled=${disabled}
        @click=${() => void this.#requestAIFromToolbar('rewrite')}
      >
        <span class="editor-action-icon rewrite-icon" aria-hidden="true"></span>
        <span>Rewrite</span>
      </button>
      <button
        class="editor-action summarize-action"
        type="button"
        ?disabled=${disabled}
        @click=${() => void this.#requestAIFromToolbar('summarize')}
      >
        <span class="editor-action-icon summarize-icon" aria-hidden="true"></span>
        <span>Summarize</span>
      </button>
      <button
        class="editor-action continue-action"
        type="button"
        ?disabled=${disabled}
        @click=${() => void this.#requestAIFromToolbar('continue')}
      >
        <span class="editor-action-icon continue-icon" aria-hidden="true"></span>
        <span>Continue</span>
      </button>
    </div>`
  }

  #renderAIResult(): unknown {
    if (this.#aiStatus === 'idle') return null
    if (this.#aiStatus === 'error') {
      return html`<section class="ai-result" aria-labelledby="ai-result-heading">
        <h2 class="ai-result-heading" id="ai-result-heading">AI proposal</h2>
        <p class="ai-error" role="alert">${this.#aiError}</p>
      </section>`
    }

    const stale = this.#aiStatus === 'proposal' && this.#isAIProposalStale()
    return html`<section class="ai-result" aria-labelledby="ai-result-heading">
      <h2 class="ai-result-heading" id="ai-result-heading">AI proposal</h2>
      ${
        this.#aiStatus === 'running'
          ? html`<p class="ai-result-status" aria-live="polite">Generating proposal</p>`
          : null
      }
      ${stale ? html`<p class="ai-stale" role="alert">The document changed after this request.</p>` : null}
      <pre class="ai-result-output" aria-live="polite">${this.#aiOutput}</pre>
      <div class="ai-actions">
        ${
          this.#aiStatus === 'running'
            ? html`<button
                class="editor-action cancel-ai-action"
                type="button"
                @click=${() => this.cancelAI()}
              >
                <span class="editor-action-icon cancel-ai-icon" aria-hidden="true"></span>
                <span>Cancel</span>
              </button>`
            : html`
                <button
                  class="editor-action accept-ai-action"
                  type="button"
                  ?disabled=${stale}
                  @click=${() => this.acceptAIProposal()}
                >
                  <span class="editor-action-icon accept-ai-icon" aria-hidden="true"></span>
                  <span>Accept</span>
                </button>
                <button
                  class="editor-action reject-ai-action"
                  type="button"
                  @click=${() => this.rejectAIProposal()}
                >
                  <span class="editor-action-icon reject-ai-icon" aria-hidden="true"></span>
                  <span>Reject</span>
                </button>
              `
        }
      </div>
    </section>`
  }

  async #requestAIFromToolbar(operation: AIOperation): Promise<void> {
    try {
      await this.requestAI(operation)
    } catch {
      // requestAI exposes failures through visible state and an event.
    }
  }

  #hasSelection(): boolean {
    const selection = this.#editorView?.state.selection.main
    return selection !== undefined && selection.from !== selection.to
  }

  #isAIProposalStale(): boolean {
    return this.#aiProposal !== undefined && this.value !== this.#aiProposal.source
  }

  #proposalDetail(proposal: AIProposal): AdocForgeAIProposalDetail {
    return {
      operation: proposal.operation,
      input: proposal.input,
      replacement: proposal.replacement,
      ...(proposal.instruction === undefined ? {} : { instruction: proposal.instruction }),
    }
  }

  #setAIError(operation: AIOperation, error: unknown): void {
    this.#aiAbortController = undefined
    this.#aiError = error instanceof Error ? error.message : 'AI operation failed'
    this.#aiOutput = ''
    this.#aiProposal = undefined
    this.#aiRequest = undefined
    this.#aiStatus = 'error'
    this.#dispatchAIEvent<AdocForgeAIErrorDetail>('adocforge-ai-error', { operation, error })
    this.requestUpdate()
  }

  #resetAIState(): void {
    this.#aiAbortController = undefined
    this.#aiError = ''
    this.#aiOutput = ''
    this.#aiProposal = undefined
    this.#aiRequest = undefined
    this.#aiStatus = 'idle'
    this.requestUpdate()
  }

  #dispatchAIEvent<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { bubbles: true, composed: true, detail }))
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
      this.#documentTitle = result.title ?? this.#titleFromSource(source)
      this.#previewError = ''
    } catch (error: unknown) {
      if (generation !== this.#previewGeneration || !this.isConnected) return

      this.#previewHtml = ''
      this.#outline = []
      this.#previewError = error instanceof Error ? error.message : 'Preview conversion failed'
    }
    this.requestUpdate()
  }

  #scheduleSave(delay = this.autosaveDelay): void {
    if (!this.isConnected || !this.storage || !this.documentId) return
    if (this.#saveTimer !== undefined) clearTimeout(this.#saveTimer)

    this.#saveTimer = setTimeout(
      () => {
        this.#saveTimer = undefined
        void this.#flushSave()
      },
      Math.max(0, delay),
    )
    this.requestUpdate()
  }

  async #flushSave(): Promise<void> {
    if (!this.storage || !this.documentId) return
    if (this.#saveInFlight) {
      this.#savePending = true
      return
    }

    const version = this.#editVersion
    const source = this.value
    this.#saveStatus = 'saving'
    this.requestUpdate()
    const saving = this.#saveDocument(source, version)
    this.#saveInFlight = saving
    try {
      await saving
    } finally {
      this.#saveInFlight = undefined
      if (this.#savePending || this.#editVersion !== version) {
        this.#savePending = false
        this.#scheduleSave(0)
      }
    }
  }

  async #saveDocument(source: string, version: number): Promise<void> {
    const storage = this.storage
    const documentId = this.documentId
    if (!storage || !documentId) return

    const now = new Date().toISOString()
    const document: AdocDocument = {
      id: documentId,
      title: this.#documentTitle || this.#titleFromSource(source),
      source,
      attributes: {},
      revision: this.#documentRevision,
      createdAt: this.#documentCreatedAt || now,
      updatedAt: this.#documentUpdatedAt || now,
    }

    try {
      const result = await storage.save(document)
      this.#documentRevision = result.revision
      this.#documentCreatedAt = document.createdAt
      this.#documentUpdatedAt = result.updatedAt
      if (this.#editVersion === version) this.#saveStatus = 'saved'
      this.#dispatchPersistenceEvent('adocforge-save', result)
    } catch (error: unknown) {
      this.#saveStatus = 'error'
      this.#dispatchPersistenceError('adocforge-save-error', error)
    }
    this.requestUpdate()
  }

  async #restoreDocument(): Promise<void> {
    const generation = ++this.#restoreGeneration
    const storage = this.storage
    const documentId = this.documentId
    if (!this.isConnected || !storage || !documentId) {
      this.#saveStatus = 'idle'
      return
    }

    this.#saveStatus = 'loading'
    this.#documentCreatedAt = ''
    this.#documentRevision = 0
    this.#documentTitle = ''
    this.#documentUpdatedAt = ''
    this.requestUpdate()
    try {
      const document = await storage.load(documentId)
      if (generation !== this.#restoreGeneration || !this.isConnected) return
      if (document) {
        this.#documentCreatedAt = document.createdAt
        this.#documentRevision = document.revision
        this.#documentTitle = document.title
        this.#documentUpdatedAt = document.updatedAt
        this.value = document.source
        this.#saveStatus = 'saved'
        this.#dispatchPersistenceEvent('adocforge-load', {
          revision: document.revision,
          updatedAt: document.updatedAt,
        })
      } else {
        this.#saveStatus = 'unsaved'
      }
    } catch (error: unknown) {
      if (generation !== this.#restoreGeneration || !this.isConnected) return
      this.#saveStatus = 'error'
      this.#dispatchPersistenceError('adocforge-load-error', error)
    }
    this.requestUpdate()
  }

  #dispatchPersistenceEvent(
    type: 'adocforge-load' | 'adocforge-save',
    result: { revision: number; updatedAt: string },
  ): void {
    this.dispatchEvent(
      new CustomEvent<AdocForgePersistenceDetail>(type, {
        bubbles: true,
        composed: true,
        detail: {
          documentId: this.documentId,
          revision: result.revision,
          updatedAt: result.updatedAt,
        },
      }),
    )
  }

  #dispatchPersistenceError(
    type: 'adocforge-load-error' | 'adocforge-save-error',
    error: unknown,
  ): void {
    this.dispatchEvent(
      new CustomEvent<AdocForgePersistenceErrorDetail>(type, {
        bubbles: true,
        composed: true,
        detail: { documentId: this.documentId, error },
      }),
    )
  }

  #saveStatusText(): string {
    switch (this.#saveStatus) {
      case 'loading':
        return 'Loading'
      case 'unsaved':
        return 'Unsaved'
      case 'saving':
        return 'Saving'
      case 'saved':
        return 'Saved'
      case 'error':
        return 'Storage failed'
      default:
        return ''
    }
  }

  #titleFromSource(source: string): string {
    return source.match(/^=\s+(.+)$/m)?.[1]?.trim() ?? 'Untitled document'
  }
}

export function registerAdocForgeEditor(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(ADOC_FORGE_EDITOR_TAG)) {
    registry.define(ADOC_FORGE_EDITOR_TAG, AdocForgeEditor)
  }
}
