// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { expect, it } from 'vitest'
import * as client from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

it('adds its stylesheet once per plugin lifetime and removes it on disposal', async () => {
  const ctx = new Context()
  const selector = 'style[data-plugin="ui-stats-line"]'
  try {
    const fiber = ctx.plugin(client)
    await fiber.await()
    const tags = document.head.querySelectorAll(selector)
    expect(tags).toHaveLength(1)
    expect(tags[0]!.getAttribute('data-plugin-css')).toBe('ui-stats-line/stats-line-override.css')
    expect(tags[0]!.textContent).toContain('text-overflow: clip')
    expect(tags[0]!.textContent).toContain('flex: none')
    await fiber.dispose()
    expect(document.head.querySelectorAll(selector)).toHaveLength(0)
    expect(hostApply()).toBeUndefined()
  } finally {
    await ctx.fiber.dispose()
  }
})
