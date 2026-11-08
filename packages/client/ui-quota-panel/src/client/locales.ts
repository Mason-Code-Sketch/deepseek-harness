/** Quota panel namespace dictionaries. */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Simplified Chinese dictionary and key-set owner. */
export const zh = {
  'error.noKey': '未配置 API Key',
  'error.credentials': '凭据被拒绝',
  'error.subscription': '无订阅',
  'error.response': '响应格式异常',
  'error.unavailable': '余额不可用',
  'error.failed': '加载失败',
  'duration.days': '{days}天{hours}小时',
  'duration.hours': '{hours}小时{minutes}分',
  'duration.minutes': '{minutes}分钟',
  'balance.loading': '余额加载中…',
  'balance.retry': '余额: {error} · 点击重试',
  'balance.window': '{currency}: 总额 {total} · 充值 {toppedUp} · 赠送 {granted}',
  'updated': '点击刷新 · 更新于 {time}',
  'balance.brand': 'deepseek',
  'usage.brand': 'Go',
  'usage.loading': 'OpenCode Go 用量加载中…',
  'usage.retry': 'OpenCode Go 用量: {error} · 点击重试',
  'window.rolling.short': '5h',
  'window.rolling.full': '5小时窗口',
  'window.weekly.short': '周',
  'window.weekly.full': '本周',
  'window.monthly.short': '月',
  'window.monthly.full': '本月',
  'usage.noData': '{window}: 无数据',
  'usage.window': '{window}: 已用 {used}% · 剩余 {remaining}%',
  'usage.reset': ' · {duration} 后重置',
} satisfies Record<string, string>

/** Quota panel locale keys. */
export type QuotaPanelKey = keyof typeof zh

/** English dictionary, complete against the Chinese key set. */
export const en = {
  'error.noKey': 'API key not configured',
  'error.credentials': 'Credentials rejected',
  'error.subscription': 'No subscription',
  'error.response': 'Unexpected response format',
  'error.unavailable': 'Balance unavailable',
  'error.failed': 'Failed to load',
  'duration.days': '{days}d {hours}h',
  'duration.hours': '{hours}h {minutes}m',
  'duration.minutes': '{minutes}m',
  'balance.loading': 'Loading balance…',
  'balance.retry': 'Balance: {error} · Click to retry',
  'balance.window': '{currency}: Total {total} · Topped up {toppedUp} · Granted {granted}',
  'updated': 'Click to refresh · Updated at {time}',
  'balance.brand': 'deepseek',
  'usage.brand': 'Go',
  'usage.loading': 'Loading OpenCode Go usage…',
  'usage.retry': 'OpenCode Go usage: {error} · Click to retry',
  'window.rolling.short': '5h',
  'window.rolling.full': '5-hour window',
  'window.weekly.short': 'Week',
  'window.weekly.full': 'This week',
  'window.monthly.short': 'Month',
  'window.monthly.full': 'This month',
  'usage.noData': '{window}: No data',
  'usage.window': '{window}: Used {used}% · Remaining {remaining}%',
  'usage.reset': ' · Resets in {duration}',
} satisfies Record<QuotaPanelKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Header balance and usage labels. */
    quotaPanel: QuotaPanelKey
  }
}
