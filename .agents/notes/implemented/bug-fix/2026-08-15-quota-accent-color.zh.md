# Agent Note: 恢复额度重点色

Status: implemented

[English](2026-08-15-quota-accent-color.md) | 中文

## 问题

额度面板中的余额和用量数字需要保持 DeepSeek 浅蓝重点色。源码样式修改后，过期的浏览器生成文件仍让运行中的客户端使用旧的中性状态类。

## 决策

`QuotaPills.module.css` 使用现有 DeepSeek 重点色变量，并提供浅蓝回退值，同时使用 `!important`，使数字颜色优先于额度胶囊的次级文字颜色。额度包在打包前通过强制 TypeScript 构建重新生成浏览器输出。

## 曾考虑的替代方案

**使用通用 brand-primary 变量。** 否决：当前 design-platform 调色板将该变量映射为中性文字色。

**只修改 TypeScript 源码并运行增量客户端构建。** 否决：该包的客户端入口经过生成的 `lib/types` 文件，过期的增量缓存会保留旧实现。

**完全绕过主题变量，只写入单一颜色。** 否决：保留现有主题变量可以继续使用 DeepSeek 调色板，回退值用于变量不可用时保持浅蓝显示。

## 后果

余额金额和用量百分比会使用 DeepSeek 浅蓝色显示。后续修改该包源码时，如果发现 `lib/types` 输出过期，需要先强制重新生成。

## 测试

额度包已使用 `pnpm exec tsc -b packages/client/ui-quota-panel/tsconfig.json --force` 强制构建，并使用客户端 tsdown 配置完成打包。已检查服务端返回包包含重点色规则，重启 DSH 后截图确认余额区域出现蓝色像素。`git diff --check` 通过。
