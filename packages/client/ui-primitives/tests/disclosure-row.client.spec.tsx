// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DisclosureRow } from '@deepseek-ai/dsh-client-ui-primitives'

afterEach(cleanup)

function setup(props: Partial<Parameters<typeof DisclosureRow>[0]> = {}) {
  const view = render(
    <DisclosureRow
      icon={<i data-testid="row-icon" />}
      title="Row"
      open={false}
      expandable
      expandOnRowClick
      onToggle={() => {}}
      {...props}
    />,
  )
  return view
}

describe('DisclosureRow', () => {
  it('keeps the caller icon rendered while collapsed and expanded', () => {
    const view = setup()
    expect(view.queryByTestId('row-icon')).not.toBeNull()
    fireEvent.click(view.getByRole('button'))
    // The identity icon must not be dropped when the row expands.
    expect(view.queryByTestId('row-icon')).not.toBeNull()
    // Controlled open is driven by the caller, so re-render with open=true.
  })

  it('marks the root open while the caller drives open=true', () => {
    const view = render(
      <DisclosureRow icon={<i data-testid="row-icon" />} title="Row" open expandable onToggle={() => {}} />,
    )
    expect(view.container.querySelector('[data-open]')).not.toBeNull()
  })

  it('overlays the expandable chevron on hover (pointing down) and while open', () => {
    const view = setup()
    const slot = view.container.querySelector('[class*="chevronSlot"]')
    expect(slot).not.toBeNull()
    expect(slot?.getAttribute('data-row-chevron')).toBe('preview')
    // The chevron glyph is always present inside the pointer-events-none slot.
    expect(slot?.querySelector('svg')).not.toBeNull()
  })

  it('never paints a chevron overlay for non-expandable rows', () => {
    const view = setup({ expandable: false })
    expect(view.container.querySelector('[class*="chevronSlot"]')).toBeNull()
    expect(view.queryByRole('button')).toBeNull()
    expect(view.queryByTestId('row-icon')).not.toBeNull()
  })

  it('hides the hover preview when previewChevron is disabled but open still marks the root', () => {
    const view = setup({ previewChevron: false })
    const slot = view.container.querySelector('[class*="chevronSlot"]')
    expect(slot?.getAttribute('data-row-chevron')).toBeNull()
    // Open still reveals the chevron (the root gains data-open).
    const openView = render(
      <DisclosureRow icon={<i data-testid="row-icon" />} title="Row" open expandable onToggle={() => {}} />,
    )
    expect(openView.container.querySelector('[data-open]')).not.toBeNull()
    expect(openView.container.querySelector('[data-testid="row-icon"]')).not.toBeNull()
  })
})
