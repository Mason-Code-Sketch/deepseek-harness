---
description: "Package map for browser-visible account balance and usage snapshots."
kind: "package-group"
---

# quota/ — account usage display

English | [中文](README.zh.md)

## Summary

The quota group supplies account balance and usage snapshots for the browser quota panel. It uses the credentials service to resolve provider keys and the host web server to expose snapshots.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)

<a id="packages"></a>
## Packages

| Package | Purpose |
|---|---|
| [quota-panel](quota-panel/README.md) | Host snapshot route for DeepSeek balance and OpenCode Go usage |

<a id="related-documentation"></a>
## Related documentation

The [Web client subsystem](../../docs/subsystems/web-client.md) owns the browser composition, and the [Credentials subsystem](../../docs/subsystems/credentials.md) owns credential resolution.

## Dev Note

The quota route serves display data rather than enforcing spending limits.
