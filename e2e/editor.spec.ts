import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

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
  await expect(editor.locator('.save-status')).toHaveText('Saved')

  await page.reload()

  const restoredEditor = page.locator('adoc-forge-editor')
  await expect
    .poll(() =>
      restoredEditor.evaluate((element) => (element as HTMLElement & { value: string }).value),
    )
    .toBe(nextValue)
  await expect(restoredEditor.locator('.save-status')).toHaveText('Saved')
})

test('imports and exports an AsciiDoc file', async ({ page }) => {
  await page.goto('/')

  const editor = page.locator('adoc-forge-editor')
  const imported = '= Imported notes\n\n== Details\n\nLoaded from disk.'
  await editor.locator('.file-input').setInputFiles({
    name: 'imported.adoc',
    mimeType: 'text/asciidoc',
    buffer: Buffer.from(imported),
  })

  await expect(editor.locator('.cm-content')).toContainText('Imported notes')
  await expect(editor.locator('.preview-content')).toContainText('Loaded from disk.')
  await expect(editor.locator('.save-status')).toHaveText('Saved')

  const downloadPromise = page.waitForEvent('download')
  await editor.getByRole('button', { name: 'Export' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('field-notes.adoc')
  const path = await download.path()
  expect(path).not.toBeNull()
  expect(await readFile(path, 'utf8')).toBe(imported)
})
