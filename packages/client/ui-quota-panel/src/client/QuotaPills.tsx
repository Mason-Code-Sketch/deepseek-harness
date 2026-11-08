/**
 * The two header pills over `/quota-panel/snapshot`. Both components share
 * one polling hook; the host route dedupes and caches the underlying fetches.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import styles from './QuotaPills.module.css'

const SNAPSHOT_URL = '/quota-panel/snapshot'
const POLL_MS = 5_000
const COUNTDOWN_TICK_MS = 30_000

interface BalanceWindow {
  readonly currency: string
  readonly total: string
  readonly granted: string
  readonly toppedUp: string
}

interface UsageWindow {
  readonly used: number
  readonly remaining: number
  readonly status: string | null
  readonly resetsAt: string | null
}

interface QuotaSnapshot {
  readonly ok: true
  readonly fetchedAt: number
  readonly balance:
    | { readonly isAvailable: true; readonly windows: readonly BalanceWindow[] }
    | { readonly isAvailable: false; readonly error: string }
  readonly usage:
    | {
      readonly ok: true
      readonly windows: {
        readonly rolling: UsageWindow | null
        readonly weekly: UsageWindow | null
        readonly monthly: UsageWindow | null
      }
    }
    | { readonly ok: false; readonly error: string }
}

type SnapshotState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly error: string }
  | { readonly kind: 'data'; readonly data: QuotaSnapshot }

/** Poll the snapshot route every 5 seconds; `refresh` forces an upstream refetch. */
function useSnapshot(): { state: SnapshotState; refresh: () => void } {
  const [state, setState] = useState<SnapshotState>({ kind: 'loading' })
  const [, setTick] = useState(0)
  useEffect(() => {
    const tick = setInterval(() => { setTick(value => value + 1) }, COUNTDOWN_TICK_MS)
    return () => { clearInterval(tick) }
  }, [])

  const alive = useRef(true)

  const load = useCallback(async (force: boolean): Promise<void> => {
    try {
      const url = force ? `${SNAPSHOT_URL}?force=1` : SNAPSHOT_URL
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP_${response.status}`)
      const data = await response.json() as unknown
      const snapshot = data as QuotaSnapshot
      if (!alive.current) return
      if (snapshot?.ok === true) setState({ kind: 'data', data: snapshot })
      else setState({ kind: 'error', error: 'BAD_RESPONSE' })
    } catch (error) {
      if (!alive.current) return
      setState({ kind: 'error', error: error instanceof Error ? error.message : 'FAILED' })
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void load(false)
    const poll = setInterval(() => { void load(false) }, POLL_MS)
    return () => {
      alive.current = false
      clearInterval(poll)
    }
  }, [load])

  const refresh = useCallback(() => { void load(true) }, [load])
  return { state, refresh }
}

function updatedLabel(fetchedAt: number): string {
  const date = new Date(fetchedAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString()
}

function errorLabel(error: string, t: TranslateNS<'quotaPanel'>): string {
  if (error === 'NO_KEY') return t('error.noKey')
  if (error === 'HTTP_401') return t('error.credentials')
  if (error === 'HTTP_403') return t('error.subscription')
  if (error === 'BAD_RESPONSE') return t('error.response')
  if (error === 'UNAVAILABLE') return t('error.unavailable')
  return t('error.failed')
}

function countdown(iso: string | null, t: TranslateNS<'quotaPanel'>): string {
  if (iso === null || iso === '') return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return ''
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return t('duration.days', { days, hours })
  if (hours > 0) return t('duration.hours', { hours, minutes })
  return t('duration.minutes', { minutes })
}

function fmtPercent(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** DeepSeek open-platform balance pill. */
export function BalancePill({ t }: PropsLocale<'quotaPanel'>) {
  const { state, refresh } = useSnapshot()

  if (state.kind === 'loading') {
    return <span className={styles.pill} title={t('balance.loading')}>¥ …</span>
  }
  if (state.kind === 'error') {
    const label = errorLabel(state.error, t)
    return (
      <span
        className={`${styles.pill} ${styles.pillError}`}
        title={t('balance.retry', { error: label })}
        onClick={refresh}
      >
        ¥ {label}
      </span>
    )
  }
  const balance = state.data.balance
  if (!balance.isAvailable) {
    return (
      <span
        className={`${styles.pill} ${styles.pillError}`}
        title={t('balance.retry', { error: errorLabel(balance.error, t) })}
        onClick={refresh}
      >
        ¥ {errorLabel(balance.error, t)}
      </span>
    )
  }
  const cny = balance.windows.find(window => window.currency === 'CNY')
  const lines = balance.windows.map(window =>
    t('balance.window', { currency: window.currency, total: window.total, toppedUp: window.toppedUp, granted: window.granted }))
  const tooltip = `${lines.join('\n')}\n${t('updated', { time: updatedLabel(state.data.fetchedAt) })}`
  return (
    <span className={styles.pill} title={tooltip} onClick={refresh}>
      <span className={styles.pillName}>{t('balance.brand')}</span>
      <span className={`${styles.pillNum} ${styles.accent}`}>
        {cny === undefined ? '—' : `¥${cny.total}`}
      </span>
    </span>
  )
}

const USAGE_WINDOWS = [
  { key: 'rolling', name: 'window.rolling.short', full: 'window.rolling.full' },
  { key: 'weekly', name: 'window.weekly.short', full: 'window.weekly.full' },
  { key: 'monthly', name: 'window.monthly.short', full: 'window.monthly.full' },
] as const

type UsageKey = (typeof USAGE_WINDOWS)[number]['key']

/** OpenCode Go usage pill: rolling 5h / weekly / monthly remaining percents. */
export function UsagePill({ t }: PropsLocale<'quotaPanel'>) {
  const { state, refresh } = useSnapshot()

  if (state.kind === 'loading') {
    return <span className={styles.pill} title={t('usage.loading')}>{t('usage.brand')} …</span>
  }
  if (state.kind === 'error') {
    const label = errorLabel(state.error, t)
    return (
      <span
        className={`${styles.pill} ${styles.pillError}`}
        title={t('usage.retry', { error: label })}
        onClick={refresh}
      >
        {t('usage.brand')} {label}
      </span>
    )
  }
  const usage = state.data.usage
  if (!usage.ok) {
    return (
      <span
        className={`${styles.pill} ${styles.pillError}`}
        title={t('usage.retry', { error: errorLabel(usage.error, t) })}
        onClick={refresh}
      >
        {t('usage.brand')} {errorLabel(usage.error, t)}
      </span>
    )
  }
  const lines = USAGE_WINDOWS.map(({ key, full }) => {
    const window = usage.windows[key as UsageKey]
    if (window === null) return t('usage.noData', { window: t(full) })
    const reset = countdown(window.resetsAt, t)
    return t('usage.window', { window: t(full), used: fmtPercent(window.used), remaining: fmtPercent(window.remaining) })
      + (reset === '' ? '' : t('usage.reset', { duration: reset }))
  })
  const tooltip = `${lines.join('\n')}\n${t('updated', { time: updatedLabel(state.data.fetchedAt) })}`
  return (
    <span className={styles.pill} title={tooltip} onClick={refresh}>
      <span className={styles.pillName}>{t('usage.brand')}</span>
      {USAGE_WINDOWS.map(({ key, name }) => {
        const window = usage.windows[key as UsageKey]
        const remaining = window === null ? null : window.remaining
        return (
          <span key={key} className={styles.window}>
            {t(name)} <span className={`${styles.pillNum} ${remaining === null ? '' : styles.accent}`}>
              {remaining === null ? '—' : `${fmtPercent(remaining)}%`}
            </span>
          </span>
        )
      })}
    </span>
  )
}
