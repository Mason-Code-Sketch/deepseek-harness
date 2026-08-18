/**
 * Quota panel host half: serves one local route,
 * `GET /quota-panel/snapshot`, with the DeepSeek open-platform balance and
 * the OpenCode Go usage windows (rolling ~5h / weekly / monthly). The
 * browser pill polls this route; nothing here leaves the loopback webServer.
 *
 * Credentials resolve per call through the credentials seam
 * (`DEEPSEEK_API_KEY` / `OPENCODE_GO_API_KEY`), so a changed key reaches the
 * next snapshot without a restart.
 * @module @deepseek-ai/dsh-quota-panel
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Stable Cordis plugin name. */
export const name = 'quota-panel'

/** Services required before the snapshot route can be served. */
export const inject = ['webServer', 'credentials']

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const ROUTE_PATH = '/quota-panel/snapshot'
const REQUEST_TIMEOUT_MS = 20_000
const CACHE_TTL_MS = 15_000

/** One currency row of the DeepSeek balance response. */
interface BalanceWindow {
  readonly currency: string
  readonly total: string
  readonly granted: string
  readonly toppedUp: string
}

/** One OpenCode Go usage window, normalized to used/remaining percents. */
interface UsageWindow {
  readonly used: number
  readonly remaining: number
  readonly status: string | null
  readonly resetsAt: string | null
}

interface UsageResult {
  readonly rolling: UsageWindow | null
  readonly weekly: UsageWindow | null
  readonly monthly: UsageWindow | null
}

/** The route's JSON contract, mirrored by the browser pill. */
export interface QuotaSnapshot {
  readonly ok: true
  readonly fetchedAt: number
  readonly balance:
    | { readonly isAvailable: true; readonly windows: readonly BalanceWindow[] }
    | { readonly isAvailable: false; readonly error: string }
  readonly usage: { readonly ok: true; readonly windows: UsageResult } | { readonly ok: false; readonly error: string }
}

interface DeepSeekBalanceResponse {
  readonly is_available: boolean
  readonly balance_infos?: readonly {
    readonly currency?: string
    readonly total_balance?: string
    readonly granted_balance?: string
    readonly topped_up_balance?: string
  }[]
}

interface OpenCodeUsageResponse {
  readonly usage?: {
    readonly rolling?: { readonly status?: string; readonly percent?: number; readonly resetsAt?: string }
    readonly weekly?: { readonly status?: string; readonly percent?: number; readonly resetsAt?: string }
    readonly monthly?: { readonly status?: string; readonly percent?: number; readonly resetsAt?: string }
  }
}

/** Fetch one JSON resource with the named bearer credential. */
async function fetchJson(url: string, key: string, ctx: Context): Promise<unknown> {
  const cred = await ctx.credentials.resolve(credentialRef(key))
  if (cred === undefined) throw new Error('NO_KEY')
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${cred.value}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  return await response.json() as unknown
}

/** Normalize one usage window: `percent` is the used share, 0–100. */
function normalizeWindow(
  window: { readonly status?: string; readonly percent?: number; readonly resetsAt?: string } | undefined,
): UsageWindow | null {
  if (window === undefined || typeof window.percent !== 'number') return null
  const used = Math.round(window.percent * 1000) / 1000
  return {
    used,
    remaining: Math.max(0, Math.round((100 - used) * 1000) / 1000),
    status: typeof window.status === 'string' ? window.status : null,
    resetsAt: typeof window.resetsAt === 'string' ? window.resetsAt : null,
  }
}

/** Normalize the raw DeepSeek balance response into display windows. */
function normalizeBalance(raw: unknown): QuotaSnapshot['balance'] {
  const data = raw as DeepSeekBalanceResponse
  if (typeof data?.is_available !== 'boolean') {
    return { isAvailable: false, error: 'BAD_RESPONSE' }
  }
  if (!data.is_available) return { isAvailable: false, error: 'UNAVAILABLE' }
  const infos = data.balance_infos ?? []
  const windows: BalanceWindow[] = []
  for (const info of infos) {
    if (info === undefined || typeof info.currency !== 'string') continue
    windows.push({
      currency: info.currency,
      total: typeof info.total_balance === 'string' ? info.total_balance : '0.00',
      granted: typeof info.granted_balance === 'string' ? info.granted_balance : '0.00',
      toppedUp: typeof info.topped_up_balance === 'string' ? info.topped_up_balance : '0.00',
    })
  }
  return { isAvailable: true, windows }
}

/** Normalize the raw OpenCode usage response into the three windows. */
function normalizeUsage(raw: unknown): QuotaSnapshot['usage'] {
  const data = raw as OpenCodeUsageResponse
  const usage = data?.usage
  const rolling = normalizeWindow(usage?.rolling)
  const weekly = normalizeWindow(usage?.weekly)
  const monthly = normalizeWindow(usage?.monthly)
  if (rolling === null && weekly === null && monthly === null) {
    return { ok: false, error: 'BAD_RESPONSE' }
  }
  return { ok: true, windows: { rolling, weekly, monthly } }
}

/** Serialize an error for the route payload without leaking internals. */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Host plugin body: register the snapshot route with a small TTL cache and
 * in-flight dedupe (the pill polls every 15 seconds; both pills share one fetch).
 */
export function apply(ctx: Context): void {
  let cache: { time: number; data: QuotaSnapshot } | null = null
  let inflight: Promise<QuotaSnapshot> | null = null

  async function load(): Promise<QuotaSnapshot> {
    const fetchedAt = Date.now()
    const [balanceOutcome, usageOutcome] = await Promise.allSettled([
      fetchJson(BALANCE_URL, 'DEEPSEEK_API_KEY', ctx),
      fetchJson(USAGE_URL, 'OPENCODE_GO_API_KEY', ctx),
    ])
    return {
      ok: true,
      fetchedAt,
      balance: balanceOutcome.status === 'fulfilled'
        ? normalizeBalance(balanceOutcome.value)
        : { isAvailable: false, error: errorMessage(balanceOutcome.reason) },
      usage: usageOutcome.status === 'fulfilled'
        ? normalizeUsage(usageOutcome.value)
        : { ok: false, error: errorMessage(usageOutcome.reason) },
    }
  }

  async function snapshot(): Promise<QuotaSnapshot> {
    const now = Date.now()
    if (cache !== null && now - cache.time < CACHE_TTL_MS) return cache.data
    if (inflight !== null) return inflight
    inflight = load().then((data) => {
      cache = { time: Date.now(), data }
      return data
    }).finally(() => {
      inflight = null
    })
    return inflight
  }

  const disposeRoute = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (_req, res) => {
      try {
        const data = await snapshot()
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        })
        res.end(JSON.stringify(data))
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: errorMessage(error) }))
      }
    },
  })
  ctx.effect(() => disposeRoute)
}
