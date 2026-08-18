/**
 * Quota panel browser half: two session-header utility pills polling the
 * host's `/quota-panel/snapshot` route — the DeepSeek balance pill and the
 * OpenCode Go usage pill (5h / weekly / monthly remaining percents).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation slot declarations (the
// conversation.session.header.utilities key) into this program.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { BalancePill, UsagePill } from './QuotaPills.tsx'

/** Required services: the slot registry only; data arrives over HTTP. */
export const inject = ['slots']

/**
 * Client plugin body: register both pills beside the settings-trigger
 * utilities. The `deepseek-balance` / `opencode-go-usage` ids keep continuity
 * with the previous dynamic-plugin cells, so a same-id registration replaces
 * them instead of stacking duplicates.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.session.header.utilities', () => {
    const disposeBalance = ctx.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'deepseek-balance',
      order: -1,
    }, BalancePill)
    const disposeUsage = ctx.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'opencode-go-usage',
      order: -1,
    }, UsagePill)
    return () => {
      disposeBalance()
      disposeUsage()
    }
  })
}
