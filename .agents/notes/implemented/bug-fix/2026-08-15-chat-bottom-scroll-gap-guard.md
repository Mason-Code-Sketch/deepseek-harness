# Agent Note: Preserve the reader's bottom gap during inertial scrolling

Status: implemented

English | [中文](2026-08-15-chat-bottom-scroll-gap-guard.zh.md)

## Problem

The conversation host treated every position within `FOLLOW_THRESHOLD` of the floor as fully settled. A duplicate scroll delivery or a transcript/composer resize could therefore write the full scroll height while the reader's trackpad or touch momentum still had a remaining distance. The bottom composer and the final transcript rows visibly jumped upward.

## Decision

`ChatView` records the reader-created distance from the physical floor while follow ownership remains within the threshold. Duplicate scroll deliveries and flow-follow layout effects keep that distance. The resize-driven follow path writes the floor only when there is no pending reader movement and the recorded gap is at most one pixel. A reader position that is already in the threshold therefore remains visually stable until it reaches the floor; once the floor is reached, normal streaming follow resumes.

The conversation scroll host and the standalone chat scroll fallback set `overscroll-behavior-y: none`, preventing vertical overscroll from chaining past the client scroll boundary.

## Alternatives considered

**Reduce `FOLLOW_THRESHOLD`.** Rejected: changing the ownership threshold would alter back-to-bottom behavior without preserving a reader's in-progress gap when the existing threshold is still useful.

**Use only `overscroll-behavior-y`.** Rejected: it controls boundary chaining, while the visible jump can also be caused by component-authored `scrollTop` writes during flow and composer resize.

**Reintroduce a device-specific gesture state machine.** Rejected: the observed-top ledger already attributes wheel, touch, scrollbar, and keyboard movement uniformly. The smaller gap guard addresses the write race without adding input-device listeners or gesture timeouts.

## Consequences

Streaming content continues to follow immediately when the reader is exactly at the floor. If the reader stops within the follow threshold above the floor, content growth does not pull the view down until the reader reaches the floor or uses the existing back-to-bottom control. Vertical overscroll chaining at the conversation boundary is disabled.

## Testing

The ChatView client suite covers duplicate scroll delivery and ResizeObserver flow growth while a reader is ten pixels above the floor. The focused conversation and skeleton suites pass together with 64 tests.
