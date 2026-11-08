---
description: "Inspect the browser balance and usage pills and their host dependency."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-quota-panel

English | [中文](README.zh.md)

## Summary

The quota panel displays DeepSeek balance and OpenCode Go usage beside the conversation header utilities. Its browser entry consumes `/quota-panel/snapshot`; its Node entry has no host behavior.

## Table of Contents

- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="understand-the-implementation"></a>
## Understand the implementation

The client entry contributes two pills through the conversation header slot. No runtime invariant companion is published because these components display the host snapshot without owning a separately maintained quota model.

<a id="model-experience"></a>
## Model Experience

None, as this package renders browser quota data without changing model inputs or Session history.

#### KV Cache effect

None. This package does not construct or modify model requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The host quota route and conversation header slot must exist.
- The displayed data is polled rather than streamed.

### Dev Note

Current constraints are listed above.
