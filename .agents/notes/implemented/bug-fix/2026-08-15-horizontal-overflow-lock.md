# Agent Note: Lock horizontal viewport movement

Status: implemented

English | [中文](2026-08-15-horizontal-overflow-lock.zh.md)

## Problem

The DSH window could move horizontally when a child view or a visual effect exceeded the viewport width. The client should keep horizontal position fixed while preserving vertical conversation scrolling.

## Decision

The web shell applies `overflow-x: hidden` and `overscroll-behavior-x: none` to `html`, `body`, and `#root`. Conversation-level clipping remains in place for the scroll body, so the global rule closes the viewport-level path without changing intentional horizontal scrolling inside bounded code and data panels.

## Alternatives considered

**Change only the conversation scroll body.** Rejected: the remaining horizontal movement can originate at the document viewport or another shell-level child.

**Set `overflow: hidden` on the whole application.** Rejected: that would also remove the vertical scroll path required by the conversation.

**Remove every inner horizontal overflow rule.** Rejected: bounded code and data panels may still need local horizontal inspection without moving the whole client.

## Consequences

The application viewport stays fixed on the horizontal axis. Vertical conversation scrolling remains available, and local bounded panels retain their own overflow behavior.

## Testing

The base stylesheet contract test passes with 4 tests. `pnpm run build:lib:client`, `pnpm run build:web`, and `git diff --check` pass. The served DSH client was restarted and a right-scroll action produced no horizontal viewport movement.
