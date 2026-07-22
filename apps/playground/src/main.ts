import { registerAdocForgeEditor } from '@adocforge/editor'
import type { AdocForgeEditor } from '@adocforge/editor'
import type { AIProvider, AIRequest } from '@adocforge/ai'
import { createIndexedDbStorage } from '@adocforge/editor/storage/indexeddb'

import './styles.css'

registerAdocForgeEditor()

const editor = document.querySelector<AdocForgeEditor>('adoc-forge-editor')
if (!editor) throw new Error('AdocForge editor element is missing')

editor.storage = createIndexedDbStorage({ databaseName: 'adocforge-playground' })
editor.documentId = 'field-notes'
editor.aiProvider = createDemoAIProvider()
editor.value = `= Field Notes

== Trailhead

Start writing here.

== Observations

* Weather: clear
* Surface: dry`

function createDemoAIProvider(): AIProvider {
  return {
    complete(request) {
      return Promise.resolve({ replacement: createDemoProposal(request) })
    },
    async *stream(request) {
      const proposal = createDemoProposal(request)
      const midpoint = Math.ceil(proposal.length / 2)
      await Promise.resolve()
      yield { delta: proposal.slice(0, midpoint) }
      yield { delta: proposal.slice(midpoint) }
    },
  }
}

function createDemoProposal(request: AIRequest): string {
  switch (request.operation) {
    case 'rewrite':
      return `= AI Rewrite\n\n${request.input}`
    case 'summarize':
      return `Summary: ${request.input.split(/\s+/).slice(0, 8).join(' ')}`
    case 'continue':
      return `${request.input}\n\nContinued in the playground.`
  }
}
