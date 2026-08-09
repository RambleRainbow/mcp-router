# MCP Router Target Product Design - Round 1

**Date**: 2026-08-09
**Session**: 第 1 轮
**Repository**: https://github.com/RambleRainbow/mcp-router
**Round 2**: See [round2-summary.md](./round2-summary.md) - Technical Spike Verification Plan

## Overview

This document summarizes the design discussion for an MCP (Model Context Protocol) Router system that routes tool calls to other MCP servers, specifically designed for financial data services (万得 AiFinMarket use case).

---

## Project Setup

### Repository Configuration
- **Repo**: `mcp-router` (public)
- **Remote**: `git@github.com:RambleRainbow/mcp-router.git`
- **Issue Tracker**: GitHub Issues
- **Triage Labels**: Canonical five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix)
- **Domain Docs**: Single-context layout (CONTEXT.md + docs/adr/)

### Agent Skills Configuration
- Matt Pocock's engineering skills installed
- AGENTS.md and CLAUDE.md synchronized for multi-agent collaboration
- GitHub CLI extensions installed: gh-dash, gh-aw, gh-skyline, gh-signoff, gh-poi, gh-markdown-preview

---

## Core System Design

### Target Product Concept

An MCP server that routes tool calls to other MCP servers with two primary meta-tools:

1. **`find_tools`**: Discovery mechanism for agents to find relevant tools
2. **`call_tool`**: Execution mechanism to invoke discovered tools

### Key Architectural Decision

**Critical Finding**: Do NOT let `find_tools` modify the tool list exposed by subsequent `tools/list` calls.

**Rationale**:
- MCP specification requires tool lists to have no side effects from other requests on the same connection
- The protocol has no implicit session
- "Search then dynamically mount real tools" is both fragile and non-compliant

**Recommended Pattern**: Fixed exposure of two meta-tools, with explicit `tool_ref` chaining two calls.

---

## Architecture

```
Agent
  │
  ├─ find_tools(query) → candidates + schema + toolRef
  │
  └─ call_tool(toolRef, arguments) → upstream result
```

### Component Structure

```
MCP Host / Agent
        │
        │ tools/call: find_tools | call_tool
        ▼
┌──────────── Inbound MCP Adapter ────────────┐
│               ToolRouter Module             │
│  find: 识别调用者 → policy 过滤 → 检索/排序  │
│  call: 解析 ref → 重验权限 → schema 验证     │
│        → 限流/超时 → 上游调用 → 结果归一化   │
└──────────────┬──────────────────┬───────────┘
               │                  │
        ToolRanker Seam     UpstreamMcp Seam
        ├─ 本地检索 Adapter ├─ stdio Adapter
        └─ Claude Adapter   ├─ HTTP Adapter
                           └─ 内存测试 Adapter
               │
      Registry + Catalog Snapshot
```

---

## API Specification

### find_tools

**Input**:
```json
{
  "query": string,     // Self-contained tool requirement
  "limit": number?     // Default 5, max 10
}
```

**Output**:
```json
{
  "status": "ready" | "clarification_required" | "no_match",
  "catalogRevision": "cat_42",
  "candidates": [{
    "toolRef": "tr_7Kd...opaque",
    "server": {
      "id": "github-prod",
      "displayName": "GitHub"
    },
    "name": "search_issues",
    "description": "按仓库、状态和标签搜索 issues",
    "inputSchema": { /* JSON Schema 2020-12 */ },
    "outputSchema": { /* Optional result structure */ },
    "matchReason": "支持仓库和状态过滤",
    "limitations": ["只读操作", "特定限制说明"],
    "usageExamples": [
      {
        "title": "示例标题",
        "useWhen": "使用场景说明",
        "arguments": { /* 示例参数 */ }
      }
    ],
    "commonErrors": [
      {
        "condition": "错误条件",
        "message": "错误消息",
        "recovery": "恢复建议"
      }
    ]
  }],
  "clarification": {
    "question": "需要澄清的问题",
    "options": ["选项1", "选项2"]
  }
}
```

### call_tool

**Input**:
```json
{
  "toolRef": string,
  "arguments": Record<string, unknown>
}
```

**Output** (on success):
```json
{
  "resultType": "complete",
  "content": [{
    "type": "text",
    "text": "结果说明"
  }],
  "structuredContent": { /* 结构化数据 */ },
  "isError": false
}
```

**Output** (on error):
```json
{
  "resultType": "complete",
  "isError": true,
  "structuredContent": {
    "error": {
      "code": "INVALID_ARGUMENTS",
      "message": "缺少必填参数",
      "violations": [{
        "path": "/reportPeriod",
        "keyword": "required"
      }],
      "recovery": "clarify_and_retry"
    }
  }
}
```

---

## MCP Schema Standards

Based on MCP 2026-07-28 official specification:

### Required Fields
```typescript
interface Tool {
  name: string;           // Required
  inputSchema: {          // Required
    $schema?: string;     // Recommended: declare 2020-12
    type: "object";       // Root must be object
  };
}
```

### Optional Fields
- `title?` - Tool title
- `description?` - Tool description
- `outputSchema?` - Result structure description
- `annotations?` - Tool annotations
- `_meta?` - Metadata

### Key Requirements

| Aspect | Requirement |
|--------|-------------|
| JSON Schema Version | Default 2020-12, explicit declaration recommended |
| inputSchema Root | Must be `type: "object"` |
| outputSchema | Can describe any JSON value (object/array/string) |
| No-parameter Tools | Use `{"type": "object", "additionalProperties": false}` |
| Tool Naming | Only requires uniqueness within single Server |
| default Behavior | Annotation only, no auto-fill guarantee |
| External $ref | Default network resolution prohibited (SSRF risk) |

---

## Financial Domain Model

### Core Concepts

| Concept | Description | Examples |
|---------|-------------|-----------|
| **Subject** | Listed company vs securities entity | 贵州茅台 → listed_company → 600519.SH |
| **Metric** | Normalized metrics | 净利润 → net_profit / net_profit_attributable |
| **Metric Variant** | Metric口径 | 合并/母公司、单季度/累计、TTM、原始/追溯调整 |
| **Time** | Period and timing | 报告期、公告日期、查询时点、时间范围、频率 |
| **Data Kind** | Data nature | 实际披露/业绩预告/分析师预期/模型预测/实时行情 |

### Capability System

```
equity.financial.actual_metric    → 贵州茅台 2024 年净利润
equity.financial.forecast_metric  → 贵州茅台预计今年净利润
equity.quote.snapshot             → 贵州茅台今天股价
equity.valuation.metric           → 贵州茅台市盈率
industry.aggregate_metric         → 白酒行业净利润
macro.economic_indicator          → 中国 GDP 增速
```

### Intent Parsing Pipeline

```
中文规范化 → 实体解析 → 指标解析 → Capability硬过滤 → Tool排序
     ↓          ↓         ↓              ↓            ↓
 全角半角   Security   术语表+规则    subjectType   Claude rerank
 简称全称     Master                 metricFamily   7因素排序
 金融缩写                          dataKind
 期间表达
```

---

## DAG Orchestration Design

### Core Conclusion

**Router Role in the Target Product**:
- Router = Discoverer + Planning Assistant + Call Proxy
- Router ≠ Generic Workflow Engine

### Why Not Execute DAG Directly

Once Router executes DAG, it requires:
- Node I/O binding language
- Concurrency and topological scheduling
- Intermediate result storage
- Retry and backoff strategies
- Partial success semantics
- Idempotency and duplicate calls
- Timeout, cancellation, and recovery
- Permissions and approvals
- Tool version drift
- Cross-server transactions or compensation

This is no longer tool routing — it's a separate **Workflow Runtime**.

### suggestedPlan Structure

```json
{
  "suggestedPlan": {
    "version": "1",
    "goal": "分析目标公司的盈利能力趋势",
    "taskInputs": [
      {
        "name": "company",
        "description": "公司名称或证券代码",
        "required": true
      },
      {
        "name": "periods",
        "description": "分析期间，例如最近五年",
        "required": true
      }
    ],
    "nodes": [
      {
        "id": "financials",
        "toolRef": "aifin-financials/stock_financials@sha256:abc123",
        "role": "获取利润表和资产负债表数据",
        "argumentBindings": {
          "security": {
            "kind": "task_input",
            "name": "company"
          },
          "indicators": {
            "kind": "literal",
            "value": ["revenue", "net_profit_attributable"]
          }
        }
      },
      {
        "id": "profitability",
        "toolRef": "financial-analysis/calculate_profitability@sha256:def456",
        "role": "计算净利率、ROA、ROE及其趋势",
        "argumentBindings": {
          "financialData": {
            "kind": "node_output",
            "nodeId": "financials",
            "jsonPointer": "/statements"
          }
        }
      }
    ],
    "outputs": {
      "analysis": {
        "kind": "node_output",
        "nodeId": "profitability",
        "jsonPointer": "/"
      }
    }
  }
}
```

### Parameter Binding Types

| kind | Description | Example |
|------|-------------|---------|
| `task_input` | Reference task input | `{"kind": "task_input", "name": "company"}` |
| `literal` | Literal value | `{"kind": "literal", "value": ["revenue"]}` |
| `node_output` | Reference other node output | `{"kind": "node_output", "nodeId": "financials", "jsonPointer": "/statements"}` |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 同名工具 | Router registration ID + versioned toolRef |
| Schema 漂移 | ref 绑定 digest；变化后返回 TOOL_REF_STALE |
| 伪造 server/schema | call_tool 只接受 ref 和 arguments |
| Prompt injection | 人工策展；先 policy 后排序；Claude 只能返回候选 ID |
| SSRF/命令执行 | 只允许管理员预注册 endpoint |
| 凭据混用 | 入站/出站 token 分离 |

---

## Claude/bash Positioning

Claude is just one Adapter in the ToolRanker Seam:
1. Policy filters invisible tools first
2. Local retrieval recalls candidate set
3. Claude only reorders to top 3-5
4. Router validates Claude-returned IDs
5. Falls back to deterministic sorting on failure

---

## Design Philosophy Evolution

### Before
- Assumption: Agent and Router share tool selection complexity

### After (Critical Thinking Simplification)
- Conclusion: Agent writes good query, Router does good matching — each focuses on their role

This is a classic case of "simplifying over-design through critical thinking."

---

## Three Orchestration Modes

| Mode | Characteristics | Use Case |
|------|----------------|----------|
| **Agent Orchestrates Atomic Tools** | Flexible, open | One-time, open-ended analysis (target default) |
| **suggestedPlan Assist** | Router provides suggested graph, Agent can modify/ignore | Agent needs planning guidance |
| **Composite Tool** | DAG encapsulated as single tool | High-frequency, fixed, governed workflows |

---

## Unvalidated Target Product Scope

This scope is a product hypothesis from Round 1, not the Technical Spike scope. Round 2 deliberately excludes these capabilities until the value experiment passes.

### ✅ Includes
- A股上市公司/证券实体解析
- 5类 Capability（行情/财务/预测/估值/宏观）
- 人工维护的金融指标术语表
- 正例/反例 + 参数提示 + 缺失槽位
- 中文 query gold dataset

### ❌ Excludes (for now)
- Multi-tool automatic orchestration
- 计算/单位转换/跨数据集 join
- 默认值产品策略（strict mode）

---

## Post-Validation Implementation Recommendation

**First Product Version, only after value validation**:
- Keep `find_tools` + `call_tool` two tools
- Agent responsible for scheduling and state management

**Deferred until evidence demonstrates a need**:
- Add `suggestedPlan` as an optional, non-executable field
- Prove Agents frequently fail at multi-tool orchestration
- Build standalone Workflow Runner
- Add `plan_tools`, `execute_plan`, `get_plan_status`, `cancel_plan`

---

## Call Examples (Financial Domain)

### Example 1: Company Profitability Trend Analysis

**Query**: "分析某上市公司的盈利能力趋势，包括收入增长、净利率和ROE的变化"

**Flow**: Requires multiple tool combination
1. Get multi-year financial data
2. Calculate profitability metrics
3. Output trend analysis

### Example 2: Industry Valuation Comparison

**Query**: "对比不同行业当前的估值水平，并判断哪些行业相对自身历史处于高位"

**Flow**: Cross-server tools required
- Industry valuation snapshot
- Industry percentile analysis

### Example 3 (Negative): Macro Impact Analysis

**Query**: "评估宏观经济对特定板块的影响"

**Result**: Returns clarification_required - too broad, needs specific parameters

---

## Key Design Decisions Summary

1. **Two meta-tools pattern**: Fixed exposure with tool_ref chaining
2. **Simplified input**: Self-contained query, no complex context
3. **Schema as single source**: JSON Schema 2020-12 as authority
4. **Router ≠ Workflow Engine**: Suggested plans only, no execution
5. **Financial domain specialization**: Entity resolution, metric disambiguation
6. **Safety first**: Policy filtering, permission checks, parameter validation
7. **Lean validation**: Start simple, prove value before complexity

---

## Next Steps

1. Run the Round 2 Technical Spike with `find_tools` and `call_tool`
2. Freeze implementation after the scripted-client and real-Agent gates pass
3. Run the Full Tools, Oracle Router, and Simple Router value experiment
4. Only if the value gate passes, decide which entity, metric, governance, or planning capabilities to build

---

## Session Notes

- Total discussion time: ~60 minutes
- Agent: codex (pm pane)
- Model switched to Opus 5 (1M context) due to context window limit
- Context reached limit during lean thinking evaluation
- Session renamed to "第 1 轮" for handoff
