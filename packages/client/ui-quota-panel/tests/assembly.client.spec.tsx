// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, vi } from 'vitest'
import { createClientTest, ClientRoster, webApp } from '@deepseek-ai/dsh-client-test-runtime/src/assembly/index.ts'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ComponentType } from 'react'
import type {} from '../src/client/locales.ts'

const SELF = '@deepseek-ai/dsh-client-ui-quota-panel'
const STATS = '@deepseek-ai/dsh-client-ui-stats-line'
const roster = ClientRoster.of([...webApp.rows,
  { name: SELF, inject: ['@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-renderer', '@deepseek-ai/dsh-client-locale'], immediately: false },
  { name: STATS, inject: [], immediately: false },
])
const it = createClientTest({ roster })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('loads optional header plugins through the production client Loader and unloads their contributions', async ({ start }) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    ok: true, fetchedAt: 0, balance: { isAvailable: false, error: 'NO_KEY' },
    usage: { ok: false, error: 'NO_KEY' },
  }) }))
  const client = await start()
  const entries = client.ctx.slots.entries('conversation.session.header.utilities')
  const balance = entries.find(entry => entry.options.id === 'deepseek-balance')!
  const Balance = balance.component as ComponentType<PropsLocale<'quotaPanel'>>
  const view = render(<Balance t={client.ctx.locale.bind('quotaPanel')} />)
  expect(await screen.findByTitle('Balance: API key not configured · Click to retry')).toBeTruthy()
  expect(document.head.querySelector('style[data-plugin="ui-stats-line"]')).not.toBeNull()
  view.unmount()
  await act(async () => { await client.unload(SELF); await client.unload(STATS) })
  expect(client.ctx.slots.entries('conversation.session.header.utilities').some(entry => entry.options.id === 'deepseek-balance')).toBe(false)
  expect(document.head.querySelector('style[data-plugin="ui-stats-line"]')).toBeNull()
}, 60000)
