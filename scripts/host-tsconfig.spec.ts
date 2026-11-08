/** Regression coverage for host packages whose bundles consume TypeScript output. */

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('host TypeScript aggregate', () => {
  it('builds the quota panel before its explicit bundle entry is consumed', () => {
    const configPath = resolve(root, 'tsconfig.host.json')
    const read = ts.readConfigFile(configPath, file => ts.sys.readFile(file))
    if (read.error !== undefined) {
      throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'))
    }
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root)
    expect(parsed.projectReferences?.map(reference => reference.path))
      .toContain(resolve(root, 'packages/quota/quota-panel'))
  })
})
