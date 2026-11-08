/** Quota route behavior with provider HTTP isolated from the test process. */
import type { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, inject, name } from '../src/index.ts'

type Route = Parameters<Context['webServer']['register']>[0]
type Handler = Route['handler']
const balanceUrl = 'https://api.deepseek.com/user/balance'
const usageUrl = 'https://opencode.ai/zen/go/v1/usage'
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function harness() {
  let handler: Handler | undefined
  const dispose = vi.fn()
  const credentials = vi.fn(async (_ref: unknown): Promise<{ value: string } | undefined> => ({ value: 'test-key' }))
  // This adapter supplies exactly the services and effect ownership read by apply.
  const ctx = {
    credentials: { resolve: credentials },
    webServer: { register: (route: Route) => {
      expect(route.kind).toBe('exact')
      expect(route.path).toBe('/quota-panel/snapshot')
      handler = route.handler
      return dispose
    } },
    effect: (effect: () => () => void) => { cleanups.push(effect()) },
  } as unknown as Context
  apply(ctx)
  async function request(url?: string) {
    const writeHead = vi.fn()
    const end = vi.fn()
    if (handler === undefined) throw new Error('route missing')
    await handler({ url } as Parameters<Handler>[0], { writeHead, end } as unknown as Parameters<Handler>[1])
    return {
      status: writeHead.mock.calls[0]?.[0] as number,
      headers: writeHead.mock.calls[0]?.[1],
      body: JSON.parse(end.mock.calls[0]?.[0] as string) as Record<string, unknown>,
    }
  }
  return { request, credentials, dispose }
}

function providers(balance: unknown, usage: unknown) {
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    expect(init?.headers).toEqual({ Authorization: 'Bearer test-key' })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    const url = String(input)
    if (url !== balanceUrl && url !== usageUrl) throw new Error(`unexpected provider ${url}`)
    return { ok: true, json: async () => url === balanceUrl ? balance : usage } as Response
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('quota snapshot route', () => {
  it('normalizes provider values and disposes its registered route', async () => {
    expect(name).toBe('quota-panel')
    expect(inject).toEqual(['webServer', 'credentials'])
    providers({ is_available: true, balance_infos: [undefined, {}, { currency: 'USD' }, { currency: 'CNY', total_balance: '9', granted_balance: '2', topped_up_balance: '7' }] }, {
      usage: { rolling: { percent: 12.34567, status: 'ok', resetsAt: 'later' }, weekly: { percent: 120 }, monthly: {} },
    })
    const h = harness()
    const result = await h.request()
    expect(result.status).toBe(200)
    expect(result.headers).toEqual({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    expect(result.body).toMatchObject({ ok: true, balance: { isAvailable: true, windows: [
      { currency: 'USD', total: '0.00', granted: '0.00', toppedUp: '0.00' },
      { currency: 'CNY', total: '9', granted: '2', toppedUp: '7' },
    ] }, usage: { ok: true, windows: { rolling: { used: 12.346, remaining: 87.654, status: 'ok', resetsAt: 'later' }, weekly: { used: 120, remaining: 0, status: null, resetsAt: null }, monthly: null } } })
    for (const cleanup of cleanups.splice(0)) cleanup()
    expect(h.dispose).toHaveBeenCalledOnce()
  })

  it.each([
    [undefined, undefined, { isAvailable: false, error: 'BAD_RESPONSE' }],
    [{ is_available: false }, {}, { isAvailable: false, error: 'UNAVAILABLE' }],
    [{ is_available: true }, { usage: {} }, { isAvailable: true, windows: [] }],
  ])('reports incomplete upstream data %#', async (balance, usage, expected) => {
    providers(balance, usage)
    const result = await harness().request()
    expect(result.body.balance).toEqual(expected)
    expect(result.body.usage).toEqual({ ok: false, error: 'BAD_RESPONSE' })
  })

  it('resolves missing credentials without sending a provider request', async () => {
    const fetch = providers({}, {})
    const h = harness()
    h.credentials.mockResolvedValue(undefined)
    expect((await h.request()).body).toMatchObject({ balance: { error: 'NO_KEY' }, usage: { error: 'NO_KEY' } })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves independent HTTP and non-Error provider failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      if (input === balanceUrl) return { ok: false, status: 429 } as Response
      throw 'provider-unavailable'
    }))
    const result = await harness().request()
    expect(result.body).toMatchObject({ balance: { error: 'HTTP_429' }, usage: { error: 'provider-unavailable' } })
  })

  it('serves cached snapshots until expiry and refreshes forced requests', async () => {
    let now = 100_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const fetch = providers({ is_available: true }, { usage: { monthly: { percent: 0 } } })
    const h = harness()
    const first = await h.request()
    now += 14_999
    expect((await h.request()).body).toEqual(first.body)
    expect(fetch).toHaveBeenCalledTimes(2)
    now += 1
    expect((await h.request()).body.fetchedAt).toBe(now)
    expect(fetch).toHaveBeenCalledTimes(4)
    await h.request('/quota-panel/snapshot?force=1')
    expect(fetch).toHaveBeenCalledTimes(6)
  })

  it('deduplicates overlapping forced requests and clears the inflight result', async () => {
    let release!: () => void
    const barrier = new Promise<void>((resolve) => { release = resolve })
    let started!: () => void
    const ready = new Promise<void>((resolve) => { started = resolve })
    let count = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (++count === 2) started()
      await barrier
      return { ok: true, json: async () => ({ is_available: true }) } as Response
    }))
    const h = harness()
    const first = h.request()
    await ready
    const second = h.request('/quota-panel/snapshot?force=1')
    release()
    expect(await first).toEqual(await second)
    expect(count).toBe(2)
    await h.request('/quota-panel/snapshot?force=1')
    expect(count).toBe(4)
  })

  it('handles absent request URLs and rejects malformed URLs', async () => {
    providers({ is_available: true }, {})
    const h = harness()
    expect((await h.request('')).status).toBe(200)
    const result = await h.request('http://[')
    expect(result.status).toBe(500)
    expect(result.body).toMatchObject({ ok: false, error: expect.any(String) })
  })
})
