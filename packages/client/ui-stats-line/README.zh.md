---
description: "了解会话统计行样式覆盖及其生成的选择器。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-stats-line

[English](README.md) | 中文

## 概述

统计行插件使会话统计信息居中显示为不截断的单行。它添加浏览器样式表；Node 入口不实现主机行为。

## 目录

- [实现说明](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制和后续工作](#known-limitations-and-deferred-work)

<a id="understand-the-implementation"></a>
## 实现说明

客户端入口拥有一个样式元素，并在释放时移除它。本包不发布运行时不变量伴随模块，因为除应用于会话视图的样式表外，它不拥有独立状态。

<a id="model-experience"></a>
## 模型体验

无，因为本包只改变浏览器样式，不改变模型输入或会话历史。

#### KV 缓存影响

无。本包不构造或修改模型请求。

## 已知限制和后续工作

<a id="known-limitations-and-deferred-work"></a>

- 选择器依赖会话生成的 CSS 类 `._3dxdVa_root`；该类变化时必须同步更新选择器。
- 较长的统计内容可能超出输入区域宽度。

### 开发备注

当前限制如上所述。
