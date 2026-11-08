/**
 * Quota panel browser half: two session-header utility pills polling the
 * host's `/quota-panel/snapshot` route — the DeepSeek balance pill and the
 * OpenCode Go usage pill (5h / weekly / monthly remaining percents).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-conversation slot declarations (the
// conversation.session.header.utilities key) into this program.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the renderer's ctx.slots service merge; ui-conversation no
// longer carries it through its emitted declarations.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { en, zh } from './locales.ts'
import { BalancePill, UsagePill } from './QuotaPills.tsx'

/** Required services: slot registry and localized copy; data arrives over HTTP. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register both pills beside the settings-trigger
 * utilities. The `deepseek-balance` / `opencode-go-usage` ids keep continuity
 * with the previous dynamic-plugin cells, so a same-id registration replaces
 * them instead of stacking duplicates.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register('quotaPanel', { zh, en }), 'ui-quota-panel: dictionaries')
  ctx.slots.inject('conversation.session.header.utilities', () => {
    const disposeBalance = ctx.slots.register({
      name: 'conversation.session.header.utilities',
      locale: 'quotaPanel',
      id: 'deepseek-balance',
      order: -1,
    }, BalancePill)
    const disposeUsage = ctx.slots.register({
      name: 'conversation.session.header.utilities',
      locale: 'quotaPanel',
      id: 'opencode-go-usage',
      order: -1,
    }, UsagePill)
    return () => {
      disposeBalance()
      disposeUsage()
    }
  })
}
