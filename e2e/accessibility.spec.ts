import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

test('has no automated WCAG A or AA violations in the initial editor', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page.locator('adoc-forge-editor .cm-content')).toBeVisible()

  await expectNoAccessibilityViolations(page, testInfo)
})

test('has no automated WCAG A or AA violations in the AI proposal state', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  const editor = page.locator('adoc-forge-editor')
  const source = editor.locator('.cm-content')

  await source.click()
  await page.keyboard.press('ControlOrMeta+A')
  await editor.getByRole('button', { name: 'Summarize' }).click()
  await expect(editor.getByRole('button', { name: 'Accept' })).toBeVisible()

  await expectNoAccessibilityViolations(page, testInfo)
})

test('exposes the primary editor workflow in keyboard order', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('adoc-forge-editor')

  await page.keyboard.press('Tab')
  await expect(editor.getByRole('button', { name: 'Import' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(editor.getByRole('button', { name: 'Export' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(editor.locator('.cm-content')).toBeFocused()

  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Tab')
  await expect(editor.getByRole('button', { name: 'Rewrite' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(editor.getByRole('button', { name: 'Accept' })).toBeVisible()

  await editor.getByRole('button', { name: 'Reject' }).focus()
  await page.keyboard.press('Enter')
  await expect(editor.locator('.ai-result')).toHaveCount(0)
})

async function expectNoAccessibilityViolations(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  await testInfo.attach('axe-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  })
  expect(results.violations).toEqual([])
}
