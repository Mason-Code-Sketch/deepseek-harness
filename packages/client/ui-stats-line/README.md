---
description: "Inspect the conversation statistics styling override and its generated selector."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-stats-line

English | [中文](README.zh.md)

## Summary

The stats-line plugin keeps conversation statistics centered on one untruncated row. It adds a browser stylesheet; its Node entry has no host behavior.

## Table of Contents

- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

<a id="understand-the-implementation"></a>
## Understand the implementation

The client entry owns a style element and removes it on disposal. No runtime invariant companion is published because the plugin owns no independent state beyond the stylesheet applied to the conversation view.

<a id="model-experience"></a>
## Model Experience

None, as this package changes browser styling without changing model inputs or Session history.

#### KV Cache effect

None. This package does not construct or modify model requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- The selector targets the generated conversation CSS class `._3dxdVa_root`; a changed class requires a matching selector update.
- Long statistics can extend beyond the input width.

### Dev Note

Current constraints are listed above.
