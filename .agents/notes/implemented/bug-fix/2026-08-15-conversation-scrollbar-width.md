# Agent Note: Narrow the conversation scrollbar

Status: implemented

English | [中文](2026-08-15-conversation-scrollbar-width.zh.md)

## Problem

The main conversation scrollbar occupied the shared 8px theme width. The requested client presentation needs the right conversation bar to be 30% narrower while keeping the overlay composer aligned with the conversation scroll gutter.

## Decision

The conversation scroll host and the standalone chat scroll fallback set their WebKit scrollbar width to 70% of the shared theme width. With the current 8px theme value, the rendered width is 5.6px. The overlay composer seat uses the same 70% calculation for its right-side compensation. The workspace sidebar and the global theme scrollbar remain at 8px.

## Alternatives considered

**Change the global scrollbar width.** Rejected: it would also change the workspace sidebar and other scroll containers that were outside the requested scope.

**Change only the scrollbar pseudo-element.** Rejected: the overlay composer seat would continue reserving the old gutter width and could shift relative to the conversation content.

**Use a fixed 5.6px value in every conversation rule.** Rejected: deriving the local value from the shared theme width keeps the requested 30% relationship if the shared width is adjusted later.

## Consequences

The right scrollbar of the main conversation is visibly narrower, while the sidebar and unrelated scroll containers keep their existing width. The overlay composer compensation follows the same calculated width. The standard scrollbar path remains governed by the existing theme fallback, so this adjustment specifically targets WebKit scrollbar rendering.

## Testing

The conversation and scrollbar contract suites pass together with 28 test files and 438 tests. `pnpm run build:lib:client` also passes.
