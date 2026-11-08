// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { expect, it } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

it('owns both localized header registrations through plugin disposal', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(SlotRegistry).await()
    ctx.slots.register({ name: 'root', children: {
      'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
    } } as never, (() => null) as never)
    ctx.provide('locale', new LocaleRuntime(ctx))
    const fiber = ctx.plugin({ apply, inject })
    await fiber.await()
    expect(ctx.slots.entries('conversation.session.header.utilities').map(entry => entry.options.id))
      .toEqual(['deepseek-balance', 'opencode-go-usage'])
    ctx.locale.setLocale('zh')
    expect(ctx.locale.bind('quotaPanel')('window.weekly.full')).toBe('本周')
    ctx.locale.setLocale('en')
    expect(ctx.locale.bind('quotaPanel')('window.weekly.full')).toBe('This week')
    await fiber.dispose()
    expect(ctx.slots.entries('conversation.session.header.utilities')).toHaveLength(0)
    expect(ctx.locale.bind('quotaPanel')('window.weekly.full')).toBe('window.weekly.full')
    expect(hostApply()).toBeUndefined()
  } finally {
    await ctx.fiber.dispose()
  }
})
