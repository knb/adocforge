import { registerAdocForgeEditor } from '@adocforge/editor'
import type { AdocForgeEditor } from '@adocforge/editor'

import './styles.css'

registerAdocForgeEditor()

const editor = document.querySelector<AdocForgeEditor>('adoc-forge-editor')
if (!editor) throw new Error('AdocForge editor element is missing')

editor.value = `= Field Notes

== Trailhead

Start writing here.

== Observations

* Weather: clear
* Surface: dry`
