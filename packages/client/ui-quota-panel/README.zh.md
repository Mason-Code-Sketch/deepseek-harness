---
description: "了解浏览器余额和用量标签及其主机依赖。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-quota-panel

[English](README.md) | 中文

## 概要

配额面板在会话页眉工具旁显示 DeepSeek 余额和 OpenCode Go 用量。浏览器入口读取 `/quota-panel/snapshot`；Node 入口不实现主机行为。

## 目录

- [实现说明](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制和后续工作](#known-limitations-and-deferred-work)

<a id="understand-the-implementation"></a>
## 实现说明

客户端入口通过会话页眉插槽提供两个标签。本包不发布运行时不变量伴随模块，因为这些组件只显示主机快照，不维护独立的配额模型。

<a id="model-experience"></a>
## 模型体验

无，因为本包只渲染浏览器配额数据，不改变模型输入或会话历史。

#### KV 缓存影响

无。本包不构造或修改模型请求。

## 已知限制和后续工作

<a id="known-limitations-and-deferred-work"></a>

- 主机配额路由和会话页眉插槽必须存在。
- 显示的数据通过轮询获取，而非流式推送。

### 开发备注

当前限制如上所述。
