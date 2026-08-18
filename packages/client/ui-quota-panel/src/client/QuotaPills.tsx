/**
 * The two header pills over `/quota-panel/snapshot`. Both components share
 * one polling hook; the host route dedupes and caches the underlying fetches.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './QuotaPills.module.css'

const SNAPSHOT_URL = '/quota-panel/snapshot'
const POLL_MS = 15_000
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

interface SnapshotState {
  readonly kind: 'loading' | 'error' | 'data'
  readonly error?: string
  readonly data?: QuotaSnapshot
}

/** Poll the snapshot route every 15 seconds; `refresh` forces a refetch. */
function useSnapshot(): { state: SnapshotState; refresh: () => void } {
  const [state, setState] = useState<SnapshotState>({ kind: 'loading' })
  const [generation, setGeneration] = useState(0)
  const alive = useRef(true)

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(SNAPSHOT_URL, { cache: 'no-store' })
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
    void load()
    const poll = setInterval(() => { void load() }, POLL_MS)
    return () => {
      alive.current = false
      clearInterval(poll)
    }
  }, [load, generation])

  const refresh = useCallback(() => { setGeneration(value => value + 1) }, [])
  return { state, refresh }
}

function updatedLabel(fetchedAt: number): string {
  const date = new Date(fetchedAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString()
}

function errorLabel(error: string): string {
  if (error === 'NO_KEY') return '未配置 API Key'
  if (error === 'HTTP_401') return '凭据被拒绝'
  if (error === 'HTTP_403') return '无订阅'
  if (error === 'BAD_RESPONSE') return '响应格式异常'
  if (error === 'UNAVAILABLE') return '余额不可用'
  return '加载失败'
}

function countdown(iso: string | null): string {
  if (iso === null || iso === '') return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return ''
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分`
  return `${minutes}分钟`
}

function fmtPercent(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** DeepSeek open-platform balance pill. */
export function BalancePill() {
  const { state, refresh } = useSnapshot()
  const [, setTick] = useState(0)
  useEffect(() => {
    const tick = setInterval(() => { setTick(value => value + 1) }, COUNTDOWN_TICK_MS)
    return () => { clearInterval(tick) }
  }, [])

  if (state.kind === 'loading') {
    return <span className={styles.pill} title="余额加载中…">¥ …</span>
  }
  if (state.kind === 'error' || state.data === undefined) {
    const label = errorLabel(state.error ?? 'FAILED')
    return (
      <span
        className={`${styles.pill} ${styles.pillError}`}
        title={`余额: ${label} · 点击重试`}
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
        title={`余额: ${errorLabel(balance.error)} · 点击重试`}
        onClick={refresh}
      >
        ¥ {errorLabel(balance.error)}
      </span>
    )
  }
  const cny = balance.windows.find(window => window.currency === 'CNY')
  const lines = balance.windows.map(window =>
    `${window.currency}: 总额 ${window.total} · 充值 ${window.toppedUp} · 赠送 ${window.granted}`)
  const tooltip = `${lines.join('\n')}\n点击刷新 · 更新于 ${updatedLabel(state.data.fetchedAt)}`
  return (
    <span className={styles.pill} title={tooltip} onClick={refresh}>
      <span className={styles.pillName}>deepseek</span>
      <span className={`${styles.pillNum} ${styles.accent}`}>
        {cny === undefined ? '—' : `¥${cny.total}`}
      </span>
    </span>
  )
}

const USAGE_WINDOWS = [
  { key: 'rolling', name: '5h', full: '5小时窗口' },
  { key: 'weekly', name: '周', full: '本周' },
  { key: 'monthly', name: '月', full: '本月' },
] as const

type UsageKey = (typeof USAGE_WINDOWS)[number]['key']

/** OpenCode Go usage pill: rolling 5h / weekly / monthly remaining percents. */
export function UsagePill() {
  const { state, refresh } = useSnapshot()
  const [, setTick] = useState(0)
  useEffect(() => {
    const tick = setInterval(() => { setTick(value => value + 1) }, COUNTDOWN_TICK_MS)
    return () => { clearInterval(tick) }
  }, [])

  if (state.kind === 'loading') {
    return <span className={styles.pill} title="OpenCode Go 用量加载中…">Go …</span>
  }
  if (state.kind === 'error' || state.data === undefined) {
    const label = errorLabel(state.error ?? 'FAILED')
    return (
      <span
        className={`${styles.pill} ${styles.pillError}`}
        title={`OpenCode Go 用量: ${label} · 点击重试`}
        onClick={refresh}
      >
        Go {label}
      </span>
    )
  }
  const usage = state.data.usage
  if (!usage.ok) {
    return (
      <span
        className={`${styles.pill} ${styles.pillError}`}
        title={`OpenCode Go 用量: ${errorLabel(usage.error)} · 点击重试`}
        onClick={refresh}
      >
        Go {errorLabel(usage.error)}
      </span>
    )
  }
  const lines = USAGE_WINDOWS.map(({ key, full }) => {
    const window = usage.windows[key as UsageKey]
    if (window === null) return `${full}: 无数据`
    const reset = countdown(window.resetsAt)
    return `${full}: 已用 ${fmtPercent(window.used)}% · 剩余 ${fmtPercent(window.remaining)}%${reset === '' ? '' : ` · ${reset} 后重置`}`
  })
  const tooltip = `${lines.join('\n')}\n点击刷新 · 更新于 ${updatedLabel(state.data.fetchedAt)}`
  return (
    <span className={styles.pill} title={tooltip} onClick={refresh}>
      <span className={styles.pillName}>Go</span>
      {USAGE_WINDOWS.map(({ key, name }) => {
        const window = usage.windows[key as UsageKey]
        const remaining = window === null ? null : window.remaining
        return (
          <span key={key} className={styles.window}>
            {name} <span className={`${styles.pillNum} ${remaining === null ? '' : styles.accent}`}>
              {remaining === null ? '—' : `${fmtPercent(remaining)}%`}
            </span>
          </span>
        )
      })}
    </span>
  )
}
