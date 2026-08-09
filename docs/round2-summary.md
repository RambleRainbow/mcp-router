# Round 2 Design Summary - Technical Spike Verification Plan

**Date**: 2026-08-09
**Session**: 第 2 轮
**Following**: Round 1 Architecture Decisions

---

## Overview

Round 2 focused on defining a Technical Spike that proves the MCP Router protocol chain works, without claiming product value. The goal is **process validation > tool perfection**.

---

## Core Verification Goal

Prove this flow works:

```
Agent
  ↓ find_tools("帮我查一下贵州茅台的最新股价")
  ↓ [返回候选 + toolRef]
  ↓ call_tool(toolRef, {...arguments})
  ↓ [返回结果]
```

---

## Technical Decisions

### SDK Selection: TypeScript

| SDK | In-Memory Support | Evaluation |
|-----|-------------------|-------------|
| **TypeScript** | InMemoryTransport | Lowest startup cost, sufficient for validation |
| Python | Direct dispatcher (no JSON-RPC framing) | Weak protocol realism |
| Go | net.Pipe + newline-delimited JSON | Over-engineering for this Spike |

**Decision**: TypeScript for both Router and Mock Server (NOT a production stack commitment)

### Transport Boundary

```
Claude Code CLI (claude-opus-5[1m]) ──stdio──→ TypeScript Router ──InMemoryTransport──→ Mock Quote Server
```

**Verification Scope**:
- ✅ Inbound: Agent + stdio
- ✅ Outbound: Router using MCP Client to call another MCP Server
- ❌ Deferred: Real upstream stdio/HTTP, reconnection, process management

### Spike Tool Reference

The Spike may issue a random, process-scoped `toolRef` backed by an in-memory map. Persistence, schema digests, and stale-reference handling belong to the target product design and are not required for this verification.

### Minimum Acceptance Criteria

| Test | Description |
|------|-------------|
| ✅ **Positive Case** | Correct query → Returns mock stock price with `mock: true` flag |
| ✅ **Negative Case** | Missing required parameter → Router returns validation error (no upstream call) |

An invalid `toolRef` case is a useful optional diagnostic, but it is not required to complete the one-positive/one-negative Spike.

### Mock Response Format

```json
{
  "securityName": "贵州茅台",
  "securityCode": "600519.SH",
  "latestPrice": 1488.20,
  "currency": "CNY",
  "asOf": "2026-08-09T15:00:00+08:00",
  "mock": true  // Critical: avoid confusion with real data
}
```

### Observability Requirements

Must log:
- Received query
- Matched rule
- Returned toolRef
- Final call parameters
- Upstream call count

---

## Two-Gate Verification Approach

| Gate | Purpose | Tool | What It Proves |
|------|---------|------|----------------|
| **Gate 1** | Exclude protocol issues | Scripted MCP Client | Technical chain works |
| **Gate 2** | Prove Agent usability | Claude Code CLI with `claude-opus-5[1m]` | Reference Agent can autonomously complete two-stage call |

**Gate 1 Success** → Technical chain is valid
**Gate 2 Success** → Agents can use this two-stage interface

**Neither proves**:
- Router is better than exposing all Tools directly
- Chinese financial matching is accurate
- Real AiFinMarket can be integrated smoothly
- Multi-tool orchestration needs DAG
- System has commercial value

These are product hypotheses for later validation.

---

## Post-Spike Value Verification

### Freeze Principle

After the required cases and both verification gates pass:
- ✅ Fix bugs blocking experiments
- ❌ NO additions: Claude ranking, multi-server, Security Master, permissions, DAG, caching, performance, persistence

### Step 1: Real Sample Preparation

PM + Finance Domain prepare:
- 20-30 real financial questions
- Real or near-real AiFinMarket Tool catalog
- Acceptable Tool(s) for each question
- Required clarifications
- Correct parameter specifications
- Final task success criteria

**Sample Composition**:
- 15 clear single-tool questions
- 10 confusing metric/period/time questions
- 5 potential multi-tool questions

### Step 2: Three Control Groups

| Group | Setup | Validation Point |
|-------|-------|------------------|
| **A. Full Tools Baseline** | Agent sees all Tool definitions | Is Router really necessary? |
| **B. Oracle Router** | find_tools returns human-annotated correct candidates | Does two-stage interface itself improve success? Can Agent fill params from schema? |
| **C. Simple Router** | Hardcoded keywords or simple LLM prompt | Can actual discovery approach Oracle upper bound? |

All three groups must use Claude Code CLI with `claude-opus-5[1m]`, the same tool metadata, and the same evaluation cases. Conclusions apply only to this reference Agent and must be revalidated for other Agent/Host combinations.

### Step 3: End-to-End Metrics

**Primary Metric**:
- Final task completion rate

**Diagnostic Metrics**:
- Top-1, Top-3 Tool recall
- First-attempt parameter correctness
- Clarification decision correctness
- Two-stage call completion rate
- Context tokens
- Total latency and model cost

---

## Decision Matrix

| Experiment Result | Next Step |
|--------------------|-----------|
| Oracle Router no better than Full Tools | **Stop Router project** |
| Oracle has advantage but Simple Router picks wrong tool | Improve Tool metadata or discovery algorithm |
| Tool selection correct but parameter filling fails | Govern schema, descriptions, examples |
| Single-tool succeeds, multi-tool fails | Establish orchestration hypothesis; don't build DAG yet |
| Success rate improves by ≥10 percentage points OR Token ↓50% (success rate decline ≤5 percentage points) | Integrate another real upstream Server |

### Initial Success Threshold

- Task completion rate improvement ≥ 10 percentage points; **OR**
- Token reduction ≥ 50% AND success rate decline ≤ 5 percentage points

**Threshold must be set BEFORE experiment, not adjusted after seeing results.**

---

## Compromises for the Technical Spike

❌ No real Security Master
❌ No complex financial terminology parsing
❌ No Claude ranking
❌ No permission control
❌ No multiple upstream adapters

---

## What We're NOT Building (Yet)

- Generic workflow engine
- Real AiFinMarket adapter
- Production-ready security
- Multi-server orchestration
- DAG execution
- Performance optimization

---

## Next Steps

1. Implement TypeScript Router with find_tools + call_tool
2. Implement in-memory Mock Quote Server
3. Write scripted MCP Client tests (Gate 1)
4. Run real Agent demo (Gate 2)
5. **FREEZE** technical implementation
6. 📋 PM and Finance: Prepare real samples
7. 🧪 Run value verification experiments

---

## Session Notes

- Total discussion time: ~30 minutes
- Agent: codex (pm pane)
- Focus shifted from "how to build" to "what to validate"
- Clear separation: technical Spike vs. product value verification

---

**Related Documents**:
- [Round 1 Design Summary](./design-summary.md) - Architecture and domain model
- [Brief Summary](./design-summary-brief.md) - Quick reference
- [ADR-0003](./adr/0003-reference-agent-selection.md) - Reference Agent selection
