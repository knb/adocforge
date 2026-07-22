import { describe, expect, it, vi } from 'vitest'

import { createAsciiDocProcessor } from '../src/index.js'

describe('AsciiDocProcessor', () => {
  it('converts source and returns a nested outline', async () => {
    const processor = createAsciiDocProcessor()
    const result = await processor.convert(`= Field Guide

== Trailhead

Start here.

=== Conditions

Dry and clear.`)

    expect(result.title).toBe('Field Guide')
    expect(result.html).toContain('<h1>Field Guide</h1>')
    expect(result.html).toContain('<p>Start here.</p>')
    expect(result.outline).toEqual([
      {
        id: '_trailhead',
        level: 1,
        title: 'Trailhead',
        line: 3,
        children: [
          {
            id: '_conditions',
            level: 2,
            title: 'Conditions',
            line: 7,
            children: [],
          },
        ],
      },
    ])
    expect(result.diagnostics).toEqual([])
  })

  it('disables include directives in secure mode', async () => {
    const processor = createAsciiDocProcessor()
    const result = await processor.convert('include::private.adoc[]')

    expect(result.html).not.toContain('private document contents')
    expect(result.html).toContain('href="private.adoc"')
  })

  it('returns structured parser diagnostics', async () => {
    const processor = createAsciiDocProcessor()
    const result = await processor.convert(`= Broken

[source]
----
unclosed`)

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          message: 'unterminated listing block',
          line: 4,
        }),
      ]),
    )
  })

  it('passes converted HTML through the configured sanitizer', async () => {
    const sanitizeHtml = vi.fn((html: string) => `<safe>${html}</safe>`)
    const processor = createAsciiDocProcessor({ sanitizeHtml })
    const result = await processor.convert('Text')

    expect(sanitizeHtml).toHaveBeenCalledOnce()
    expect(result.html).toBe('<safe><div class="paragraph">\n<p>Text</p>\n</div></safe>')
  })
})
