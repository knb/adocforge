import { StreamLanguage } from '@codemirror/language'
import type { StreamParser } from '@codemirror/language'

interface AsciiDocState {
  blockDelimiter: string | null
}

const BLOCK_DELIMITERS = new Set(['----', '....', '====', '____', '****', '++++'])

const asciidocParser: StreamParser<AsciiDocState> = {
  name: 'asciidoc',
  startState: () => ({ blockDelimiter: null }),
  token(stream, state) {
    if (stream.sol()) {
      const line = stream.string

      if (state.blockDelimiter) {
        stream.skipToEnd()
        if (line === state.blockDelimiter) {
          state.blockDelimiter = null
          return 'processingInstruction'
        }
        return state.blockDelimiter === '////' ? 'comment' : 'monospace'
      }

      if (line === '////' || BLOCK_DELIMITERS.has(line)) {
        state.blockDelimiter = line
        stream.skipToEnd()
        return line === '////' ? 'comment' : 'processingInstruction'
      }

      if (stream.match(/^\/\/.*/)) return 'comment'

      const heading = line.match(/^(={1,6})\s+/)
      if (heading) {
        stream.skipToEnd()
        return `heading${heading[1]?.length ?? 1}`
      }

      if (stream.match(/^:[A-Za-z0-9_-]+:/)) return 'meta'
      if (stream.match(/^\[[^\]]+\]$/)) return 'meta'
      if (stream.match(/^\.[^\s.].*/)) return 'labelName'
      if (stream.match(/^(?:\*+|\.+|-|\d+\.)\s+/)) return 'list'
    }

    if (stream.eatSpace()) return null
    if (stream.match(/^\*\*[^*]+\*\*/)) return 'strong'
    if (stream.match(/^\*[^*]+\*/)) return 'strong'
    if (stream.match(/^__[^_]+__/)) return 'emphasis'
    if (stream.match(/^_[^_]+_/)) return 'emphasis'
    if (stream.match(/^`[^`]+`/)) return 'monospace'
    if (stream.match(/^<<[^>]+>>/)) return 'link'
    if (stream.match(/^(?:https?:\/\/|mailto:)[^\s\]]+/)) return 'url'
    if (stream.match(/^(?:image|include|xref|link)::?[^\s[]+\[[^\]]*\]/)) return 'link'
    if (stream.match(/^\{[A-Za-z0-9_-]+\}/)) return 'variableName'

    stream.next()
    return null
  },
}

export const asciidocLanguage = StreamLanguage.define(asciidocParser)
