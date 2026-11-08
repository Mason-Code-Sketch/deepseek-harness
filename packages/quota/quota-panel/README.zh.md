---
description: "了解主机配额快照端点及其凭据和缓存要求。"
kind: "package-reference"
---

# @deepseek-ai/dsh-quota-panel

[English](README.md) | 中文

## 概要

配额面板通过 `/quota-panel/snapshot` 向浏览器提供 DeepSeek 余额和 OpenCode Go 用量数据。它依赖 Web 服务器和凭据服务。

## 目录

- [实现说明](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制和后续工作](#known-limitations-and-deferred-work)

<a id="understand-the-implementation"></a>
## 实现说明

主机入口注册快照路由，并通过凭据服务解析凭据。本包不发布运行时不变量伴随模块，因为它没有可与快照比较的上游余额或用量独立观测值。

<a id="model-experience"></a>
## 模型体验

无，因为本包仅提供浏览器 HTTP 数据，不注册模型工具，也不修改模型消息。

#### KV 缓存影响

无。本包不构造或修改模型请求。

## 已知限制和后续工作

<a id="known-limitations-and-deferred-work"></a>

- 上游 API 及其凭据必须可用；余额和用量错误分别报告。
- 缓存快照可能滞后于上游用量。

### 开发备注

当前限制如上所述。
