# Gate 2 Evidence: Reference Agent Two-Stage Flow + Spike Freeze

**Date**: 2026-08-09
**Ticket**: #4 - Verify the two-stage flow with the Reference Agent and freeze the Spike
**Status**: ✅ GATE 2 PASSED — Technical Spike FROZEN

---

## Run Configuration

| Item | Value |
|------|-------|
| Reference Agent | Claude Code CLI 2.1.226 (headless `claude -p`) |
| Model | `claude-opus-5[1m]` (reported in `modelUsage`) |
| Transport | stdio via `.mcp.json` → `npx tsx src/stdio.ts` |
| Router revision | the commit containing this record (see `git log`); code state = `b886f51` + Gate 2 iteration changes (meta-tool descriptions, match keywords) |
| Prompt (verbatim) | `帮我查一下贵州茅台的最新股价` — no hint about which Meta-tool to call |
| Allowed tools | `mcp__router__find_tools`, `mcp__router__call_tool` only |

## Tool Metadata at Run Time

- `find_tools` — 发现可用的金融数据工具。查询股票行情、财务等金融数据时，先调用本工具：传入自包含的自然语言 query，返回匹配的 Candidate Tool（含 inputSchema 和不透明的 Tool Reference）
- `call_tool` — 调用 find_tools 返回的上游金融数据工具：传入其 Tool Reference，并按该工具的 inputSchema 填写 arguments，返回数据结果
- Candidate Tool: `get_latest_quote`（查询 A 股证券最新行情快照（mock 数据）, inputSchema requires `securityName`）

## Reproduce

```bash
claude -p "帮我查一下贵州茅台的最新股价" \
  --model "claude-opus-5[1m]" \
  --mcp-config .mcp.json --strict-mcp-config \
  --allowedTools "mcp__router__find_tools" "mcp__router__call_tool" \
  --output-format stream-json --verbose
```

## Passing Run Trace (2026-08-09, 3 turns, $0.1025)

1. Agent autonomously calls `find_tools` with `{"query": "贵州茅台股票最新股价行情", "limit": 5}` → `status: "ready"`, one Candidate Tool with `toolRef: tr_ce9e5487-…`
2. Agent fills arguments from the returned `inputSchema` and calls `call_tool` with `{"toolRef": "tr_ce9e5487-…", "arguments": {"securityName": "贵州茅台"}}`
3. Result returned: `{"securityName":"贵州茅台","securityCode":"600519.SH","latestPrice":1488.2,"currency":"CNY","asOf":"2026-08-09T15:00:00+08:00","mock":true}`
4. Agent presents the quote and explicitly flags it: **"⚠️ 注意：此数据为模拟数据（mock），仅供测试使用。"**

**Two-stage flow completed autonomously: YES.**

## Iteration History (two failed runs fixed before the pass)

| Run | Outcome | Root cause | Fix (allowed under freeze principle: bugs blocking the experiment) |
|-----|---------|-----------|-------------------------------------------------------------------|
| 1 | Agent ignored Router, asked for WebSearch permission | Meta-tool descriptions didn't say the Router serves financial data | Rewrote `find_tools`/`call_tool` descriptions to state financial-data purpose |
| 2 | Agent called `find_tools` 3×, all `no_match` | Match rule was a single exact substring `股价`; agent rephrased ("股票价格…行情", English, "股票行情查询") | Broadened rule to keyword list `["股价", "股票价格", "行情", "quote"]` |
| 3 | ✅ PASS | — | — |

## Pre-Gate Scripted Cases

Before the Gate 2 run: `tsc --noEmit` clean; `vitest run` 4/4 green (3 positive-path + 1 negative-path scripted MCP Client cases, tickets #2/#3). Re-verified after each iteration above.

## Scope of What This Proves

This Spike proves **protocol feasibility only**: a scripted Client and the locked Reference Agent can discover a Candidate Tool and invoke it through the Router's fixed two-stage MCP interface.

It does **not** prove:

- Router product value over exposing all tools directly
- Compatibility with a real upstream (AiFinMarket) server
- Chinese financial matching accuracy (hardcoded keyword-list rule)
- Multi-Agent / multi-Host support (conclusions apply only to Claude Code CLI + `claude-opus-5[1m]` and must be revalidated for any other combination)
- DAG / multi-tool orchestration

## Freeze Declaration

**The Technical Spike is declared FROZEN as of this record.**

Per `docs/round2-summary.md` (Freeze Principle):

- ✅ Allowed without a new product decision: fixes for defects that block the subsequent value experiment (Full Tools / Oracle Router / Simple Router control groups)
- ❌ Forbidden without a new product decision: Claude ranking, multi-server support, Security Master, permissions, DAG, caching, performance work, persistence, and any new feature

## Next Steps (post-freeze, per round2 plan)

1. PM + Finance: prepare 20-30 real financial questions and the AiFinMarket Tool catalog sample
2. Run the three control-group value experiments with the same Reference Agent configuration
3. Apply the pre-set success threshold (≥10pp task-completion improvement, or ≥50% token reduction with ≤5pp completion decline) before any further Router investment
