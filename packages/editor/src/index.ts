import { LitElement, html } from 'lit'

export const ADOC_FORGE_EDITOR_TAG = 'adoc-forge-editor' as const

export class AdocForgeEditor extends LitElement {
  protected render() {
    return html`<slot></slot>`
  }
}

export function registerAdocForgeEditor(registry: CustomElementRegistry = customElements): void {
  if (!registry.get(ADOC_FORGE_EDITOR_TAG)) {
    registry.define(ADOC_FORGE_EDITOR_TAG, AdocForgeEditor)
  }
}
