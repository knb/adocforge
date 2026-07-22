import { expect, test } from '@playwright/test'

test('edits AsciiDoc and updates the sanitized preview', async ({ page }) => {
  await page.goto('/')

  const editor = page.locator('adoc-forge-editor')
  const source = editor.locator('.cm-content')
  const nextValue = '= Updated document\n\n== Current section\n\nBrowser input.'

  await expect(source).toHaveAttribute('aria-labelledby', 'editor-label')
  await editor.evaluate((element) => {
    element.addEventListener('adocforge-change', (event) => {
      if (!(event instanceof CustomEvent)) return
      const detail: unknown = event.detail
      if (typeof detail !== 'object' || detail === null || !('value' in detail)) return
      if (typeof detail.value !== 'string') return

      element.setAttribute('data-last-change', detail.value)
    })
  })

  await source.fill(nextValue)

  await expect(editor).toHaveAttribute('data-last-change', nextValue)
  await expect(editor.locator('.preview-content')).toContainText('Updated document')
  await expect(editor.locator('.preview-content')).toContainText('Browser input.')
  await expect(editor.locator('.outline-list')).toContainText('Current section')
})
