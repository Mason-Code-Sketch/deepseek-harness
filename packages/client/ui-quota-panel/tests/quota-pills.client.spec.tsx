// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BalancePill, UsagePill } from '../src/client/QuotaPills.tsx'
import { en, zh } from '../src/client/locales.ts'

function translate(dictionary: Record<string, string>): Parameters<typeof BalancePill>[0]['t'] {
  return (key, params = {}) => dictionary[key]!.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name]))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const snapshot = {
  ok: true,
  fetchedAt: 0,
  balance: { isAvailable: true, windows: [{ currency: 'CNY', total: '12.34', toppedUp: '10', granted: '2.34' }] },
  usage: { ok: true, windows: {
    rolling: { used: 25, remaining: 75, status: null, resetsAt: '1970-01-01T00:00:00Z' },
    weekly: null,
    monthly: { used: 10.25, remaining: 89.75, status: null, resetsAt: null },
  } },
}

describe.each([
  { locale: 'en', dictionary: en, balance: 'CNY: Total 12.34', usage: '5-hour window: Used 25% · Remaining 75% · Resets in 0m', missing: 'This week: No data' },
  { locale: 'zh', dictionary: zh, balance: 'CNY: 总额 12.34', usage: '5小时窗口: 已用 25% · 剩余 75% · 0分钟 后重置', missing: '本周: 无数据' },
])('$locale quota labels', ({ dictionary, balance, usage, missing }) => {
  it('localizes loading, balances, usage windows, countdowns and refresh hints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot })
    vi.stubGlobal('fetch', fetchMock)
    const t = translate(dictionary)
    render(<><BalancePill t={t} /><UsagePill t={t} /></>)
    expect(screen.getByTitle(dictionary['balance.loading'])).toBeTruthy()
    expect(screen.getByTitle(dictionary['usage.loading'])).toBeTruthy()
    await waitFor(() => { expect(screen.getByText('¥12.34')).toBeTruthy() })
    const balancePill = screen.getByText('deepseek').parentElement!
    const usagePill = screen.getByText('Go').parentElement!
    expect(balancePill.title).toContain(balance)
    expect(usagePill.title).toContain(usage)
    expect(usagePill.title).toContain(missing)
    expect(usagePill.title).toContain('89.8%')
    expect(balancePill.title).toContain(dictionary.updated.split('{time}')[0])
    fireEvent.click(balancePill)
    expect(fetchMock).toHaveBeenLastCalledWith('/quota-panel/snapshot?force=1', { cache: 'no-store' })
  })

  it.each([
    ['NO_KEY', 'error.noKey'], ['HTTP_401', 'error.credentials'],
    ['HTTP_403', 'error.subscription'], ['BAD_RESPONSE', 'error.response'],
    ['UNAVAILABLE', 'error.unavailable'], ['FAILED', 'error.failed'],
  ] as const)('localizes %s and retry actions', async (error, key) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      ...snapshot, balance: { isAvailable: false, error }, usage: { ok: false, error },
    }) }))
    const t = translate(dictionary)
    render(<><BalancePill t={t} /><UsagePill t={t} /></>)
    await waitFor(() => { expect(screen.getByTitle(t('balance.retry', { error: dictionary[key] }))).toBeTruthy() })
    expect(screen.getByTitle(t('usage.retry', { error: dictionary[key] }))).toBeTruthy()
  })
})


describe('quota polling lifecycle', () => {
  const t = translate(en)
  it.each([
    { response: null, label: 'Unexpected response format' },
    { response: { ok: false }, label: 'Unexpected response format' },
    { response: undefined, label: 'Credentials rejected' },
  ])('renders transport and invalid-envelope failures', async ({ response, label }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response === undefined
      ? { ok: false, status: 401 }
      : { ok: true, json: async () => response }))
    render(<><BalancePill t={t} /><UsagePill t={t} /></>)
    await waitFor(() => { expect(screen.getByTitle(t('balance.retry', { error: label }))).toBeTruthy() })
    expect(screen.getByTitle(t('usage.retry', { error: label }))).toBeTruthy()
  })

  it('renders non-Error rejection and missing currency/time without inventing data', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce('offline').mockResolvedValue({ ok: true, json: async () => ({
      ...snapshot, fetchedAt: NaN, balance: { isAvailable: true, windows: [] },
    }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<BalancePill t={t} />)
    const error = await screen.findByTitle(t('balance.retry', { error: 'Failed to load' }))
    fireEvent.click(error)
    await waitFor(() => { expect(screen.getByText('deepseek')).toBeTruthy() })
    expect(screen.getByText('deepseek').parentElement!.title).toBe('\nClick to refresh · Updated at —')
    expect(screen.getByText('—')).toBeTruthy()
  })

  it.each([
    { seconds: 90000, text: '1d 1h' },
    { seconds: 3660, text: '1h 1m' },
    { seconds: 60, text: '1m' },
    { seconds: 'invalid', text: '' },
    { seconds: '', text: '' },
  ])('formats remaining reset duration $seconds', async ({ seconds, text }) => {
    vi.spyOn(Date, 'now').mockReturnValue(0)
    const resetsAt = typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : seconds
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      ...snapshot, usage: { ok: true, windows: { ...snapshot.usage.windows,
        rolling: { ...snapshot.usage.windows.rolling, resetsAt },
      } },
    }) }))
    render(<UsagePill t={t} />)
    await waitFor(() => { expect(screen.queryByTitle(en['usage.loading'])).toBeNull() })
    const title = screen.getByText('Go').parentElement!.title
    expect(title.includes('Resets in')).toBe(text !== '')
    if (text !== '') expect(title).toContain(`Resets in ${text}`)
    vi.restoreAllMocks()
  })

  it('polls and ticks until unmount, ignoring a late successful response', async () => {
    vi.useFakeTimers()
    const pending: Array<(value: unknown) => void> = []
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot })
      .mockImplementation(() => new Promise((resolve) => { pending.push(resolve) }))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<UsagePill t={t} />)
    await act(async () => { await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(fetchMock).toHaveBeenCalledTimes(7)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => {
      for (const finish of pending) finish({ ok: true, json: async () => snapshot })
    })
    expect(view.container.childNodes).toHaveLength(0)
  })

  it('ignores a fetch rejection after unmount', async () => {
    let reject!: (error: Error) => void
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((_resolve, fail) => { reject = fail })))
    const view = render(<BalancePill t={t} />)
    view.unmount()
    await act(async () => { reject(new Error('offline')) })
    expect(view.container.childNodes).toHaveLength(0)
  })
})
