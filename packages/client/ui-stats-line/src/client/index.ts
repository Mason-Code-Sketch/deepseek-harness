/**
 * Session stats line browser half: overrides the StatsLine truncation so the
 * strip stays on one centered row and overlong content extends symmetrically
 * past both sides of the input box instead of wrapping or ellipsizing.
 *
 * The override targets the conversation plugin's CSS-module class
 * (`._3dxdVa_root` in the current build). Its specificity
 * (`[data-composer-seat]` attribute plus class) beats the module rule, so the
 * injection order relative to the conversation bundle does not matter.
 */
import type { Context } from '@deepseek-ai/cordis'

/** Stable Cordis plugin name (also the injected style tag's owner marker). */
export const name = 'ui-stats-line'

/**
 * StatsLine root lives under `[data-composer-seat]`. The original module rule
 * forces `white-space: nowrap` + `overflow: hidden` + `text-overflow:
 * ellipsis`; flex centering keeps one row and makes overflow symmetric.
 */
const CSS = `[data-composer-seat] ._3dxdVa_root {
  display: flex;
  justify-content: center;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}
[data-composer-seat] ._3dxdVa_root > * {
  flex: none;
}
`

/**
 * Client plugin body: inject one owned <style> tag and remove it when the
 * plugin fiber unwinds.
 * @param ctx - client plugin context.
 */
export function apply(ctx: Context): void {
  const tag = document.createElement('style')
  tag.dataset.plugin = name
  tag.dataset.pluginCss = `${name}/stats-line-override.css`
  tag.textContent = CSS
  document.head.appendChild(tag)
  ctx.effect(() => () => tag.remove())
}
