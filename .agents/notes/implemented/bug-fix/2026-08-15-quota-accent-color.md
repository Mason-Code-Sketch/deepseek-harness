# Agent Note: Restore the quota accent color

Status: implemented

English | [中文](2026-08-15-quota-accent-color.zh.md)

## Problem

The balance and usage numbers in the quota panel must keep the DeepSeek light-blue accent. A stale generated browser file caused the running client to keep an older neutral status class after the source stylesheet changed.

## Decision

`QuotaPills.module.css` uses the existing DeepSeek accent token with a light-blue fallback and `!important` so the number color wins over the pill's secondary text color. The quota package browser output is regenerated with a forced TypeScript build before bundling.

## Alternatives considered

**Use the generic brand-primary token.** Rejected: the current design-platform palette maps that token to neutral ink.

**Edit only the TypeScript source and run the incremental client build.** Rejected: the package's client bundle entry points through generated `lib/types` files, and the stale incremental cache left the old implementation in place.

**Hard-code only one color without a theme token.** Rejected: the existing theme token preserves the DeepSeek palette while the fallback protects the light-blue presentation if the token is unavailable.

## Consequences

The balance amount and usage percentages render in DeepSeek light blue. Future source changes in this package require a forced TypeScript regeneration when the generated `lib/types` output is stale.

## Testing

The quota package was rebuilt with `pnpm exec tsc -b packages/client/ui-quota-panel/tsconfig.json --force` and bundled with its client tsdown configuration. The served bundle contains the accent rule, and a restarted DSH screenshot confirms blue pixels in the balance region. `git diff --check` passes.
