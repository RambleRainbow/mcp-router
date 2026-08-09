# Three-Arm Run 2026-08-09T14-51-09-147Z-pilot-2026-08

**NON-SCORED** — DIRECTIONAL pilot (not the #5 scored experiment): five real-style financial questions, LLM-drafted single-reviewer labels, mechanical completion proxy only; results are directional and must not feed the formal 30-case scored set

## Pinned configuration

```json
{
  "model": "claude-opus-5[1m]",
  "cliVersion": "2.1.226 (Claude Code)",
  "codeRevision": "2c0f5d6760849060a43c1e0b42ca907e7c035cdf",
  "worktreeDirty": true,
  "catalogHash": "sha256:f762824f0c93765488cfb6775fca0521830cf408099362f05cd37f97cb73a444",
  "processSetPath": "evaluation/pilot/pilot-set.json",
  "processSetSha256": "254ca23aedc96d32d34e1755640a0d552a9628954fa229dcfb24aacb912c128d",
  "simpleRouterDiscoveryPromptRevision": "32dc7b91e11e",
  "simpleRouterDiscoveryModel": "claude-opus-5[1m]",
  "transport": "stdio"
}
```

## Hard-limit accounting

- Arm sessions used: 15 / 15 (the limit counts one session per case × arm)
- Simple Router discovery CLI calls: 5 (extra claude processes; counted toward the cost limit, not the arm-session limit)
- Model cost: $2.0188 / $5 (discovery calls included)
- Completeness: complete — all 5 cases ran once through A/B/C

## Case: case-p01 (representative)

- User prompt: 平安银行2026年一季报的营业收入和净利润分别是多少
- Acceptable tools: get_stock_fundamentals
- Clarification expectation: 无需澄清：实体、指标与报告期在问句中均已明确。question 为自由文本，任何表述均可接受（只记录、不判定）。
- Arm order (counterbalanced): A-full-tools → B-oracle-router → C-simple-router
- caseFileSha256: 7d9b5b755aabe6adfaf6c412bfb42e2b874df96c3c1b27f5919db73be63a4621

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| A-full-tools | (full catalog) | get_company_announcements, get_stock_fundamentals | 3 | 0.1697 | 8.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| B-oracle-router | get_stock_fundamentals | find_tools, call_tool | 3 | 0.1163 | 7.7 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_stock_fundamentals | find_tools, call_tool | 3 | 0.1184 session + 0.1170 discovery = 0.2354 | 17.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-p02 (representative)

- User prompt: 帮我查一下华泰柏瑞沪深300ETF（510300.SH）的最新规模、管理费率和跟踪的指数
- Acceptable tools: get_fund_info
- Clarification expectation: 无需澄清：基金实体与所需指标在问句中均已明确。question 为自由文本，任何表述均可接受（只记录、不判定）。
- Arm order (counterbalanced): B-oracle-router → C-simple-router → A-full-tools
- caseFileSha256: 63eb468c12701984030f2999bb6fddd71eb4a429f6928a1693c5cbd72801a737

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| B-oracle-router | get_fund_info | find_tools, call_tool | 3 | 0.1069 | 7.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_fund_info, get_fund_holders | find_tools, call_tool, call_tool | 4 | 0.1140 session + 0.0913 discovery = 0.2053 | 27.1 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| A-full-tools | (full catalog) | get_fund_info | 2 | 0.0934 | 11.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: unknown<br>process_only: declared |

## Case: case-p03 (challenge-metric-variant)

- User prompt: 对比一下宁德时代和比亚迪最新的毛利率
- Acceptable tools: get_stock_fundamentals, get_financial_data
- Clarification expectation: 毛利率存在整体/分业务、单季/累计/TTM 等 Metric Variant，问句未指定口径；接受任一 acceptableTools 与任一口径，无需追问澄清，但回答须注明所用口径并使两家公司口径一致。question 为自由文本，任何表述均可接受（只记录、不判定）。
- Arm order (counterbalanced): C-simple-router → A-full-tools → B-oracle-router
- caseFileSha256: 106ebb539023a492093e6f338978f85d2f947830ab806c72175018e8f38cba67

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| C-simple-router | get_stock_fundamentals | find_tools, find_tools, call_tool, call_tool | 5 | 0.0974 session + 0.0618 discovery = 0.1592 | 46.1 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| A-full-tools | (full catalog) | get_stock_fundamentals, get_stock_fundamentals | 3 | 0.0824 | 14.2 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| B-oracle-router | get_stock_fundamentals, get_financial_data | find_tools, call_tool | 3 | 0.0941 | 15.6 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-p04 (challenge-time)

- User prompt: 最近三个月沪深300指数表现怎么样
- Acceptable tools: get_index_kline, get_index_technicals
- Clarification expectation: “最近三个月”为相对时间，Time 口径不明：接受 K 线区间（get_index_kline）或派生区间统计（get_index_technicals）任一解释，无需追问澄清，但回答须注明实际起止日期；日期与周期取值只记录、不判定。
- Arm order (counterbalanced): A-full-tools → B-oracle-router → C-simple-router
- caseFileSha256: fc5b25492bb1566c60f264887d0bc51691081b15d0b5a134af37277979a545a9

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| A-full-tools | (full catalog) | get_index_kline, get_index_technicals | 3 | 0.1079 | 14.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| B-oracle-router | get_index_kline, get_index_technicals | find_tools, call_tool | 3 | 0.1061 | 11.8 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_index_kline | find_tools, call_tool | 3 | 0.1002 session + 0.0623 discovery = 0.1625 | 19.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-p05 (challenge-multi-tool)

- User prompt: 贵州茅台最近有没有分红或股本变动？顺便把相关公告也找出来看看
- Acceptable tools: get_stock_events, get_company_announcements
- Clarification expectation: 结构化事件（get_stock_events）与公告文本（get_company_announcements）分别覆盖问句的两个需求；允许 Agent 只完成其中一部分（潜在多工具，不强制两次调用）。question/query 为自由文本，任何表述均可接受（只记录、不判定）。
- Arm order (counterbalanced): B-oracle-router → C-simple-router → A-full-tools
- caseFileSha256: f38d151df5bc265e5844a0ada6e7206f4522d08594ffecc0fcf07fda81810a2e

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| B-oracle-router | get_stock_events, get_company_announcements | find_tools, call_tool, call_tool | 4 | 0.1156 | 10.1 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_company_announcements, get_stock_events | find_tools, call_tool, call_tool | 4 | 0.1196 session + 0.0612 discovery = 0.1807 | 40.1 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| A-full-tools | (full catalog) | get_stock_events, get_company_announcements | 3 | 0.0832 | 6.5 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Pilot outcome (directional only)

This pilot previews the end-to-end effect before the formal experiment.
It is NOT the #5 scored experiment: five LLM-drafted, single-reviewer
cases, no independent financial adjudication, no blinded scoring —
completion is a mechanical proxy (acceptable tool invoked with declared
arguments, fixture data reported). The pre-registered decision rule in
#5 has no statistical meaning at this sample size; no continue/stop
decision may be derived from this run.

## Recorded deviations from the #5 protocol

- 30 questions reduced to 5 (Acting PM decision, to be revisited)
- Gold labels drafted by LLM, adjudicated by the Acting PM alone — no two independent financial reviewers
- No blinded scorer: mechanical rubric plus Acting PM review
- Catalog: frozen public wind-skills fallback (hash above); live `tools/list` snapshot still unconfirmed
- These five cases must not be merged into the formal scored set


