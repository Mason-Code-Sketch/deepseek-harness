---
description: "Inspect the host quota snapshot endpoint and its credential and caching requirements."
kind: "package-reference"
---

# @deepseek-ai/dsh-quota-panel

English | [中文](README.zh.md)

## Summary

The quota panel exposes DeepSeek balance and OpenCode Go usage data to the browser through `/quota-panel/snapshot`. It requires the web server and credentials services.

## Table of Contents

- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="understand-the-implementation"></a>
## Understand the implementation

The host entry registers the snapshot route and resolves credentials through the credentials service. No runtime invariant companion is published because this package has no independent observation of the upstream balances or usage against which to compare its snapshot.

<a id="model-experience"></a>
## Model Experience

None, as this package serves browser HTTP data without registering model tools or modifying model messages.

#### KV Cache effect

None. This package does not construct or modify model requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Upstream APIs and their credentials must be available; balance and usage failures are reported independently.
- Cached snapshots can lag upstream usage.

### Dev Note

Current constraints are listed above.
