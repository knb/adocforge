import { MemoryLogger, load } from '@asciidoctor/core'
import type { AbstractBlock, LogMessage } from '@asciidoctor/core'

import type {
  AsciiDocProcessor,
  ConversionResult,
  ConvertOptions,
  Diagnostic,
  DiagnosticSeverity,
  OutlineItem,
  ProcessorOptions,
} from './types.js'

const SEVERITY_MAP: Readonly<Record<string, DiagnosticSeverity>> = {
  DEBUG: 'info',
  INFO: 'info',
  WARN: 'warning',
  ERROR: 'error',
  FATAL: 'error',
  UNKNOWN: 'error',
}

function buildOutline(sections: AbstractBlock[], path: number[] = []): OutlineItem[] {
  return sections.map((section, index) => {
    const itemPath = [...path, index + 1]
    const line = section.getLineNumber() ?? 1

    return {
      id: section.getId() ?? `section-${itemPath.join('-')}`,
      level: section.getLevel() ?? itemPath.length,
      title: section.getTitle() ?? '',
      line,
      children: buildOutline(section.getSections(), itemPath),
    }
  })
}

function toDiagnostic(message: LogMessage): Diagnostic {
  const location = message.getSourceLocation()
  const line = location?.getLineNumber()
  const file: unknown = location?.getFile()
  const diagnostic: Diagnostic = {
    severity: SEVERITY_MAP[message.getSeverity()] ?? 'error',
    message: message.getText(),
  }

  if (line !== undefined) diagnostic.line = line
  if (typeof file === 'string' && file.length > 0) diagnostic.source = file

  return diagnostic
}

class DefaultAsciiDocProcessor implements AsciiDocProcessor {
  readonly #options: ProcessorOptions

  constructor(options: ProcessorOptions) {
    this.#options = options
  }

  async convert(source: string, options: ConvertOptions = {}): Promise<ConversionResult> {
    const logger = MemoryLogger.create()
    const document = await load(source, {
      safe: 'secure',
      sourcemap: true,
      logger,
      attributes: options.showTitle === false ? {} : { showtitle: '' },
    })
    const converted = await document.convert({ standalone: options.standalone ?? false })
    const html = this.#options.sanitizeHtml
      ? await this.#options.sanitizeHtml(converted)
      : converted
    const title = document.getTitle()
    const result: ConversionResult = {
      html,
      outline: buildOutline(document.getSections()),
      diagnostics: logger.getMessages().map(toDiagnostic),
    }

    if (title !== null) result.title = title

    return result
  }
}

export function createAsciiDocProcessor(options: ProcessorOptions = {}): AsciiDocProcessor {
  return new DefaultAsciiDocProcessor(options)
}
