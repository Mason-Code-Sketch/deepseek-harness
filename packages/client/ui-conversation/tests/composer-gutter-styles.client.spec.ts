import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

it('shares one whole-pixel gutter between the scrollbar and overlay composer', () => {
  const css = readFileSync(fileURLToPath(new URL('../src/client/skeleton/ConversationRoot.module.css', import.meta.url)), 'utf8')
  const values = new Map<string, string>()
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const declaration of match[2]!.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon < 0) continue
      values.set(`${match[1]!.trim()}:${declaration.slice(0, colon).trim()}`, declaration.slice(colon + 1).trim())
    }
  }
  expect(values.get('.root:--dsh-conversation-scrollbar-width'))
    .toBe('round(down, calc(var(--dsh-scrollbar-width) * 0.7), 1px)')
  expect(values.get('.scrollBody::-webkit-scrollbar:width'))
    .toBe('var(--dsh-conversation-scrollbar-width)')
  expect(values.get('.scrollBody:has([data-conversation-composer-overlay]) > .composerSeat:right'))
    .toBe('var(--dsh-conversation-scrollbar-width)')
  expect(values.get('.scrollBody:margin-right')).toBe('2px')
})
