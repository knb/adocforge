export type DiagnosticSeverity = 'info' | 'warning' | 'error'

export interface Diagnostic {
  severity: DiagnosticSeverity
  message: string
  line?: number
  column?: number
  source?: string
}

export interface OutlineItem {
  id: string
  level: number
  title: string
  line: number
  children: OutlineItem[]
}

export interface ConversionResult {
  html: string
  outline: OutlineItem[]
  diagnostics: Diagnostic[]
  title?: string
}

export interface ConvertOptions {
  standalone?: boolean
  showTitle?: boolean
}

export type HtmlSanitizer = (html: string) => string | Promise<string>

export interface ProcessorOptions {
  sanitizeHtml?: HtmlSanitizer
}

export interface AsciiDocProcessor {
  convert(source: string, options?: ConvertOptions): Promise<ConversionResult>
}
