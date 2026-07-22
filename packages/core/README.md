# `@adocforge/core`

Framework-independent AsciiDoc processing contracts for AdocForge.

## Installation

```sh
npm install @adocforge/core
```

## Processor

```typescript
import { createAsciiDocProcessor } from '@adocforge/core'

const processor = createAsciiDocProcessor({
  sanitizeHtml: (html) => sanitizer.sanitize(html),
})

const result = await processor.convert(source)
console.log(result.html, result.outline, result.diagnostics)
```

The processor always loads source in Asciidoctor secure mode. Callers cannot lower the safe mode or pass arbitrary converter attributes. Local and remote include targets are not read.

`secure` mode does not make generated HTML safe for every DOM context. Configure `sanitizeHtml` before sending `result.html` to a browser HTML sink. AdocForge's editor package must provide this boundary before preview rendering.

## Result

`convert()` returns:

- embedded or standalone HTML
- a nested section outline with source line numbers
- structured parser diagnostics
- the document title when present

AsciiDoc source remains canonical. HTML and outline data are derived values.

## License

MIT
