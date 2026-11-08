---
description: "浏览器账户余额和用量快照的软件包索引。"
kind: "package-group"
---

# quota/ — 账户用量显示

[English](README.md) | 中文

## 概要

quota 组为浏览器配额面板提供账户余额和用量快照。它通过凭据服务解析提供方密钥，并通过主机 Web 服务器提供快照。

## 目录

- [软件包](#packages)
- [相关文档](#related-documentation)

<a id="packages"></a>
## 软件包

| 软件包 | 用途 |
|---|---|
| [quota-panel](quota-panel/README.zh.md) | 提供 DeepSeek 余额和 OpenCode Go 用量的主机快照路由 |

<a id="related-documentation"></a>
## 相关文档

[Web 客户端子系统](../../docs/subsystems/web-client.zh.md)负责浏览器组合，[凭据子系统](../../docs/subsystems/credentials.zh.md)负责凭据解析。

## 开发备注

配额路由提供显示数据，不执行支出限制。
