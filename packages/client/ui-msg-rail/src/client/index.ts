/**
 * User message history rail browser half: a floating vertical rail pinned to
 * the right edge of the conversation scrollport. Each small horizontal bar
 * represents one user-sent message; hovering a bar extends it (with the
 * surrounding bars stepping shorter) and shows a preview card — the user's
 * input on a bold single line, the assistant reply below clamped to three
 * lines — and clicking scrolls the conversation so the message sits just
 * below the top edge.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConversationSnapshot, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
// Type-only: pulls the shell.overlay slot declaration (ui-layout) into this program.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { createElement, Fragment, useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

/** Required services: the slot registry plus the session list/service face. */
export const inject = ['slots', 'sessions']

/** Stable Cordis plugin name (also the injected style tag's owner marker). */
export const name = 'ui-msg-rail'

const CSS = `
.msg-rail {
  position: fixed;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding: 8px 2px;
  pointer-events: auto;
  z-index: 1000;
  max-height: 60vh;
  overflow-y: auto;
  scrollbar-width: none;
  width: 44px;
}
.msg-rail::-webkit-scrollbar { display: none; }
.msg-bar-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 3px 0;
  cursor: pointer;
  position: relative;
  pointer-events: auto;
  width: 100%;
}
.msg-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--dsw-alias-label-secondary, #888);
  opacity: 0.45;
  cursor: pointer;
  position: relative;
  flex: none;
  transition: width 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
}
.msg-bar-cell:hover .msg-bar {
  background: var(--dsw-alias-brand-primary, #4f8cff);
  opacity: 1;
}
.msg-tip {
  position: fixed;
  transform: translate(-100%, -50%);
  z-index: 1001;
  background: var(--dsw-alias-bg-overlay, #1f1f1f);
  color: var(--dsw-alias-label-primary, #eee);
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.35));
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  width: 280px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.28);
  pointer-events: none;
}
.msg-tip-q {
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.msg-tip-a {
  margin-top: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}
`

const BAR_WIDTH = 12
const BAR_WIDTH_HOVER = 40
const BAR_STEP = 9
const END_PUNCT = /[。.!?！？…]$/
const TOP_OFFSET = 16

function barWidthAt(distance: number | null): number {
  if (distance === null) return BAR_WIDTH
  return Math.max(BAR_WIDTH, BAR_WIDTH_HOVER - distance * BAR_STEP)
}

interface RailItem {
  readonly key: string
  readonly text: string
  readonly reply: string
}

/** Clamp the assistant reply to three lines; drop the ellipsis when the last line ends in sentence punctuation. */
function ClampedReply({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(text)

  useLayoutEffect(() => {
    const el = ref.current
    if (el === null) return
    const cs = window.getComputedStyle(el)
    const lineHeight = parseFloat(cs.lineHeight) || 19.5
    const maxHeight = lineHeight * 3
    el.textContent = text
    if (el.scrollHeight <= maxHeight + 1) {
      setShown(text)
      return
    }
    let lo = 0
    let hi = text.length
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      el.textContent = text.slice(0, mid)
      if (el.scrollHeight <= maxHeight + 1) lo = mid
      else hi = mid - 1
    }
    const cut = text.slice(0, lo)
    if (END_PUNCT.test(cut)) {
      setShown(cut)
      return
    }
    let candidate = cut
    while (candidate.length > 0) {
      el.textContent = candidate + '…'
      if (el.scrollHeight <= maxHeight + 1) break
      candidate = candidate.slice(0, -1)
    }
    if (candidate.length === 0) {
      setShown(cut)
      return
    }
    if (END_PUNCT.test(candidate)) {
      setShown(candidate)
      return
    }
    setShown(candidate + '…')
  }, [text])

  return createElement('div', { ref, className: 'msg-tip-a' }, shown)
}

/** Scroll the conversation so the row lands TOP_OFFSET below the scrollport top. */
function jumpTo(key: string): void {
  const rows = document.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')
  for (const row of rows) {
    if (row.dataset.chatAnchorKey !== key) continue
    const scrollport = row.closest('[data-conversation-scroll]')
    if (scrollport === null) {
      row.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const rowRect = row.getBoundingClientRect()
    const portRect = scrollport.getBoundingClientRect()
    const target = rowRect.top - portRect.top + scrollport.scrollTop - TOP_OFFSET
    scrollport.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    return
  }
}

/** Chat node shape read off the conversation snapshot (narrowed defensively). */
interface ChatNodeLike {
  readonly kind?: unknown
  readonly visibility?: unknown
  readonly data?: unknown
}

/** Extract plain text from content blocks (text blocks only; both wire vocabularies). */
function blockText(blocks: readonly unknown[]): string {
  let text = ''
  for (const block of blocks) {
    if (block !== null && typeof block === 'object') {
      const b = block as { type?: unknown; kind?: unknown; text?: unknown }
      if ((b.type === 'text' || b.kind === 'text') && typeof b.text === 'string') {
        if (text !== '') text += '\n'
        text += b.text
      }
    }
  }
  return text
}

/**
 * Client plugin body: register the floating rail into the frame-wide overlay
 * seat and inject the owned style tag, both cleaned up with the fiber.
 * @param ctx - client plugin context.
 */
export function apply(ctx: ClientContext): void {
  const tag = document.createElement('style')
  tag.dataset.plugin = name
  tag.dataset.pluginCss = `${name}/rail.css`
  tag.textContent = CSS
  document.head.appendChild(tag)
  ctx.effect(() => () => tag.remove())

  const sessions = ctx.sessions

  function MsgRail({ useSessions }: {
    useSessions: (selector: (state: SessionListState) => SessionId | undefined) => SessionId | undefined
  }) {
    const currentId = useSessions(s => s.current)
    const [snapshot, setSnapshot] = useState<ConversationSnapshot | null>(null)
    const [tip, setTip] = useState<{ left: number; top: number; item: RailItem } | null>(null)
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

    useEffect(() => {
      if (currentId === undefined) {
        setSnapshot(null)
        return
      }
      const face = sessions.binding(currentId)?.session
      if (face === undefined) {
        setSnapshot(null)
        return
      }
      const update = () => setSnapshot(face.getSnapshot())
      update()
      return face.subscribe(update)
    }, [currentId])

    useEffect(() => {
      const measure = () => {
        const node = document.querySelector<HTMLElement>('[data-conversation-scroll]')
        if (node === null) {
          setPos(null)
          return
        }
        const rect = node.getBoundingClientRect()
        setPos({ left: rect.right - 8, top: rect.top + rect.height / 2 })
      }
      measure()
      window.addEventListener('resize', measure)
      let ro: ResizeObserver | null = null
      const node = document.querySelector<HTMLElement>('[data-conversation-scroll]')
      if (node !== null && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(measure)
        ro.observe(node)
      }
      return () => {
        window.removeEventListener('resize', measure)
        if (ro !== null) ro.disconnect()
      }
    }, [])

    const items = useMemo<RailItem[]>(() => {
      if (snapshot === null) return []
      const order = snapshot.chat.order
      const out: RailItem[] = []
      for (let i = 0; i < order.length; i++) {
        const key = order[i]
        if (key === undefined) continue
        const node = snapshot.chat.nodes.get(key) as ChatNodeLike | undefined
        if (node === undefined || node.kind !== 'user' || node.visibility === 'hidden') continue
        const data = node.data
        if (data === undefined || data === null || typeof data !== 'object') continue
        const content = (data as { content?: unknown }).content
        if (!Array.isArray(content)) continue
        const text = blockText(content)
        if (text.trim() === '') continue
        let reply = ''
        for (let j = i + 1; j < order.length; j++) {
          const nextKey = order[j]
          if (nextKey === undefined) continue
          const next = snapshot.chat.nodes.get(nextKey) as ChatNodeLike | undefined
          if (next === undefined) continue
          if (next.kind === 'user' || next.kind === 'steering') break
          if (next.kind !== 'assistant-step') continue
          const ad = next.data
          if (ad === null || typeof ad !== 'object') continue
          const blocks = (ad as { blocks?: unknown }).blocks
          if (!Array.isArray(blocks)) continue
          reply = blockText(blocks)
        }
        out.push({ key, text, reply })
      }
      return out
    }, [snapshot])

    if (items.length === 0) return null

    const style = pos === null
      ? { right: 8, top: '50%', transform: 'translateY(-50%)' }
      : { left: pos.left, top: pos.top, transform: 'translate(-100%, -50%)' }

    const hoveredKey = tip === null ? null : tip.item.key
    const hoveredIndex = hoveredKey === null ? null : items.findIndex(item => item.key === hoveredKey)

    return createElement(
      Fragment,
      null,
      createElement(
        'div',
        { className: 'msg-rail', style, onMouseLeave: () => setTip(null) },
        items.map((item, index) => {
          const distance = hoveredIndex === null ? null : Math.abs(index - hoveredIndex)
          return createElement(
            'div',
            {
              key: item.key,
              className: 'msg-bar-cell',
              onMouseEnter: (e: ReactMouseEvent<HTMLDivElement>) => {
                const r = e.currentTarget.getBoundingClientRect()
                setTip({ left: r.left - 10, top: r.top + r.height / 2, item })
              },
              onClick: () => jumpTo(item.key),
            },
            createElement('div', {
              className: 'msg-bar',
              style: { width: barWidthAt(distance) },
            }),
          )
        }),
      ),
      tip === null ? null : createElement(
        'div',
        { className: 'msg-tip', style: { left: tip.left, top: tip.top } },
        createElement('div', { className: 'msg-tip-q' }, tip.item.text),
        tip.item.reply === ''
          ? null
          : createElement(ClampedReply, { text: tip.item.reply }),
      ),
    )
  }

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'user-msg-rail',
  }, (props: { useSessions: (selector: (state: SessionListState) => SessionId | undefined) => SessionId | undefined }) => (
    createElement(MsgRail, { useSessions: props.useSessions })
  )))
}
