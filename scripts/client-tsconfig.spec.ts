/** Regression coverage for source declarations owned by the client test aggregate. */

import { existsSync, readdirSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

function clientCssDeclarations(): string[] {
  const clientGroups = ['client', 'extensions']
  return clientGroups.flatMap((group) => {
    const clientRoot = resolve(root, 'packages', group)
    return readdirSync(clientRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => resolve(clientRoot, entry.name, 'src/css-modules.d.ts'))
  })
    .filter(existsSync)
    .map(file => file.replaceAll(sep, '/'))
    .sort()
}

function readAggregate(name: string): ts.ParsedCommandLine {
  const read = ts.readConfigFile(resolve(root, name), file => ts.sys.readFile(file))
  if (read.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'))
  }
  return ts.parseJsonConfigFileContent(read.config, ts.sys, root)
}

describe('TypeScript aggregates', () => {
  it.each([
    ['tsconfig.host.json', 'quota/quota-panel'],
    ['tsconfig.client.json', 'client/ui-quota-panel'],
    ['tsconfig.client.json', 'client/ui-stats-line'],
  ])('%s builds %s before bundling its entry', (config, packagePath) => {
    expect(readAggregate(config).projectReferences?.map(reference => resolve(reference.path)))
      .toContain(resolve(root, 'packages', packagePath))
  })

  it('loads client CSS declarations without relying on workspace-link realpaths', () => {
    const loaded = readAggregate('tsconfig.client.json').fileNames
      .map(file => file.replaceAll(sep, '/'))
      .filter(file => file.endsWith('/src/css-modules.d.ts'))
      .sort()
    expect(loaded).toEqual(clientCssDeclarations())
  })
})
