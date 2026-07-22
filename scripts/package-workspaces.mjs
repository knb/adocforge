/** Current AdocForge packages in dependency-safe publish order. */

export const ADOCFORGE_WORKSPACES = ['@adocforge/core', '@adocforge/ai', '@adocforge/editor']

export const ADOCFORGE_PACKAGE_DIRS = {
  '@adocforge/core': 'packages/core',
  '@adocforge/ai': 'packages/ai',
  '@adocforge/editor': 'packages/editor',
}

/** Legacy package metadata retained for migration-only scripts. */

export const KBMEMO_PACKAGE_VERSION = '0.1.0'

/** @type {readonly string[]} */
export const KBMEMO_WORKSPACES = [
  '@kbmemo/adoc-kbmemo',
  '@kbmemo/adoc-codemirror',
  '@kbmemo/adoc-preview',
  '@kbmemo/adoc-wysiwyg',
  '@kbmemo/adoc-editor',
]

/** Dependency order for registry publish (deps first). */
export const KBMEMO_PUBLISH_ORDER = [...KBMEMO_WORKSPACES]

export const KBMEMO_REPOSITORY = {
  type: 'git',
  url: 'https://gitea.artif.org/Artif.org/kbmemo_site.git',
}
