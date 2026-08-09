# ADR 0003: Reference Agent Selection

**Status**: Accepted
**Date**: 2026-08-09
**Context**: Technical Spike Verification

## Decision

Gate 2 验证和三组价值对照实验使用 **Claude Code (Opus 5)** 作为参考实现。

## Rationale

| Factor | Consideration |
|--------|---------------|
| **当前环境** | 设计讨论已在 Opus 5 上进行 |
| **能力最大化** | Spike 目标是验证可行性，使用最强模型提高成功概率 |
| **MCP Host** | Claude Code 内置 stdio transport，自然的测试环境 |
| **可复现性** | 模型版本可锁定：claude-opus-5[1m] |

## Locked Configuration

- **Agent**: Claude Code CLI
- **Model**: Opus 5 (claude-opus-5[1m])
- **MCP Transport**: stdio
- **Scope**: Gate 2 + 三组价值对照实验

## Applicability

本决策适用于：
- Technical Spike 的 Gate 2 验证
- Full Tools / Oracle Router / Simple Router 三组对照
- 所有成功门槛判断（成功率、Token 消耗）

**注意**：结论只适用于此参考实现。如果后续支持其他 Agent/Host，需要重新验证。

## Consequences

- ✅ Spike 实现有明确的目标环境
- ✅ 价值实验结果具有可比性
- ⚠️ 结论不能直接推广到其他 Agent/Host
- ⚠️ 模型更新后需要重新验证
