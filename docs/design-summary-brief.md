# MCP Router - Design Summary (Brief)

## What We're Building

An MCP server that routes tool calls to other MCP servers, focused on financial data services (万得 AiFinMarket).

## Two Core Tools

### 1. find_tools(query, limit?)
- **Purpose**: Discovery - find relevant tools for a given query
- **Returns**: candidates with schema, toolRef, matchReason, limitations
- **Status**: ready | clarification_required | no_match

### 2. call_tool(toolRef, arguments)
- **Purpose**: Execution - invoke a discovered tool
- **Input**: Opaque toolRef + validated arguments
- **Returns**: Structured result or error with recovery info

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Fixed 2 meta-tools | MCP spec requires no side effects in tools/list |
| Opaque toolRef | Prevents forgery, enables versioning |
| Self-contained query | Simplified over complex context through critical thinking |
| suggestedPlan only | Router ≠ workflow engine (future separate system) |

## Financial Domain Specialization

**Concepts**: Subject, Metric, Variant, Time, DataKind
**Capabilities**: equity.financial.actual_metric, equity.quote.snapshot, industry.aggregate_metric
**Pipeline**: Chinese normalization → Entity resolution → Metric parsing → Capability filter → Tool ranking

## Risk Mitigation

- **同名工具**: Registration ID + versioned toolRef
- **Schema drift**: ref binds digest → TOOL_REF_STALE on change
- **Prompt injection**: Policy first, human curation, Claude returns IDs only
- **SSRF**: Admin-registered endpoints only
- **Credential mixing**: Inbound/outbound token separation

## MCP Schema Standards

- JSON Schema 2020-12
- inputSchema root must be `type: "object"`
- outputSchema optional, can describe any JSON value
- External $ref prohibited (SSRF risk)

## Unvalidated Target Product Scope

This is not the Round 2 Technical Spike scope. It is considered only after the value gate passes.

✅ Includes: A股实体解析, 5类Capability, 人工术语表, 中文query数据集
❌ Excludes: 自动多工具编排, 单位转换, 跨数据集join

## Three Orchestration Modes

| Mode | When to Use |
|------|-------------|
| Agent orchestrates (target default) | One-time, open analysis |
| suggestedPlan assist | Agent needs planning guidance |
| Composite Tool | High-frequency, governed workflows |

## Next Steps

1. Run the Round 2 Technical Spike
2. Freeze the implementation when both gates pass
3. Run the three-arm value experiment
4. Build product capabilities only if the value gate passes

---

**Repository**: https://github.com/RambleRainbow/mcp-router
**Session**: 第 1 轮 (2026-08-09)
**Full Design**: See [design-summary.md](./design-summary.md)
