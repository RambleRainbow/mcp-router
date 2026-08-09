# Three-Arm Process-MVP Run 2026-08-09T13-08-49-915Z-process-mvp-2026-08

**NON-SCORED** — NON-SCORED process-MVP set: six synthetic cases run once through A/B/C to prove the evaluation process is reproducible; makes no product-value claim and must not feed a later scored experiment

## Pinned configuration

```json
{
  "model": "claude-opus-5[1m]",
  "cliVersion": "2.1.226 (Claude Code)",
  "codeRevision": "6588783aca31eef96dd19f87bc85cb35c503f020",
  "worktreeDirty": true,
  "catalogHash": "sha256:f762824f0c93765488cfb6775fca0521830cf408099362f05cd37f97cb73a444",
  "processSetPath": "evaluation/three-arm/process-set.json",
  "processSetSha256": "82964d324b5d3d8adddd261315b7291b5a73a4b81fa43b2d549c230155ae3023",
  "simpleRouterDiscoveryPromptRevision": "32dc7b91e11e",
  "simpleRouterDiscoveryModel": "claude-opus-5[1m]",
  "transport": "stdio"
}
```

## Hard-limit accounting

- Arm sessions used: 18 / 18 (the limit counts one session per case × arm)
- Simple Router discovery CLI calls: 6 (extra claude processes; counted toward the cost limit, not the arm-session limit)
- Model cost: $2.4615 / $10 (discovery calls included)
- Completeness: complete — all 6 cases ran once through A/B/C

- Rederived: traces and this summary were regenerated from the immutable raw logs at 2026-08-09T13:38:28.495Z (code 6588783aca31); reason: explicit hard-limit accounting: arm sessions (limit-scoped) reported separately from Simple Router discovery CLI calls

## Case: case-001 (clear-single-tool)

- User prompt: 帮我查一下贵州茅台2026年8月5日到8月7日的日K线数据
- Acceptable tools: get_stock_kline
- Clarification expectation: 无需澄清：标的、时间范围与频率在问句中均已明确。
- Arm order (counterbalanced): A-full-tools → B-oracle-router → C-simple-router
- caseFileSha256: 5296c10040f26ea50257cac5a04e4ae2f1c968b86a9e8445c4acf0628d2f54a3

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| A-full-tools | (full catalog) | get_stock_kline | 2 | 0.1508 | 7.8 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: unknown<br>process_only: declared |
| B-oracle-router | get_stock_kline | find_tools, call_tool | 3 | 0.1283 | 9.4 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_stock_kline | find_tools, call_tool | 3 | 0.1302 session + 0.1160 discovery = 0.2462 | 23.5 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-002 (clear-single-tool)

- User prompt: 帮我查一下华夏上证50ETF（510050.SH）2026年8月3日到8月7日的日K线数据
- Acceptable tools: get_fund_kline
- Clarification expectation: 无需澄清：标的、时间范围与频率在问句中均已明确。
- Arm order (counterbalanced): B-oracle-router → C-simple-router → A-full-tools
- caseFileSha256: cb2137c26698b31399ec5067fc63b304e42e002c91675ff4eab044b10bcc7d0f

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| B-oracle-router | get_fund_kline | find_tools, call_tool | 3 | 0.1190 | 9.0 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_fund_kline | find_tools, call_tool | 3 | 0.1179 session + 0.0620 discovery = 0.1799 | 16.8 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| A-full-tools | (full catalog) | get_fund_kline | 2 | 0.1050 | 7.2 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-003 (metric-variant-ambiguity)

- User prompt: 查一下贵州茅台最新的ROE是多少
- Acceptable tools: get_stock_fundamentals, get_financial_data
- Clarification expectation: ROE 存在摊薄、加权、扣非、TTM 等 Metric Variant，问句未指定口径；接受任一可支持 ROE 查询的 acceptableTools 与任一口径，无需追问澄清，但回答须注明所用口径。question 为自由文本，任何表述均可接受（只记录、不判定）。
- Arm order (counterbalanced): C-simple-router → A-full-tools → B-oracle-router
- caseFileSha256: 956b9896ea40e8b2f18a022602e215f29885a88b1e7ced62e0d20fe18cc19326

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| C-simple-router | get_stock_fundamentals | find_tools, call_tool | 3 | 0.0958 session + 0.0594 discovery = 0.1552 | 16.0 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| A-full-tools | (full catalog) | get_stock_fundamentals | 2 | 0.0775 | 4.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| B-oracle-router | get_stock_fundamentals, get_financial_data | find_tools, call_tool | 3 | 0.0907 | 7.6 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-004 (time-ambiguity)

- User prompt: 帮我看看宁德时代最近的股价表现
- Acceptable tools: get_stock_price_indicators, get_stock_quote, get_stock_kline
- Clarification expectation: “最近”时间口径不明：接受时点截面（get_stock_price_indicators）、当日分钟序列（get_stock_quote）或近期 K 线（get_stock_kline）任一解释，无需追问澄清，但回答须注明所用时间口径；日期与周期取值只记录、不判定。
- Arm order (counterbalanced): A-full-tools → B-oracle-router → C-simple-router
- caseFileSha256: 54d8f626283b7c1918cb03fa37cc71b2448e8afecaa9bdedd20d15b9133c59ea

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| A-full-tools | (full catalog) | get_stock_price_indicators, get_stock_kline | 3 | 0.0967 | 9.6 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| B-oracle-router | get_stock_price_indicators, get_stock_quote, get_stock_kline | find_tools, call_tool, call_tool | 4 | 0.1296 | 11.2 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_stock_price_indicators, get_stock_quote, get_stock_kline | find_tools, call_tool, call_tool | 4 | 0.1170 session + 0.0605 discovery = 0.1776 | 20.5 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-005 (potential-multi-tool)

- User prompt: 查一下贵州茅台的最新行情快照，再看看它的前十大股东情况
- Acceptable tools: get_stock_price_indicators, get_stock_equity_holders
- Clarification expectation: 两个需求均需数据，可分别由两个 acceptableTools 满足；允许 Agent 只完成其中一部分（潜在多工具，不强制两次调用）。question 为自由文本，任何表述均可接受。
- Arm order (counterbalanced): B-oracle-router → C-simple-router → A-full-tools
- caseFileSha256: 094d2e56ff824937fd9a116b71e69867701e8970545bcc5809414a07805987c1

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| B-oracle-router | get_stock_price_indicators, get_stock_equity_holders | find_tools, find_tools, call_tool, call_tool | 5 | 0.1032 | 7.4 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_stock_price_indicators, get_stock_quote, get_stock_technicals, get_stock_equity_holders | find_tools, find_tools, call_tool, call_tool | 5 | 0.1045 session + 0.0607 discovery = 0.1652 | 30.3 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| A-full-tools | (full catalog) | get_stock_price_indicators, get_stock_equity_holders | 3 | 0.0852 | 5.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Case: case-006 (potential-multi-tool)

- User prompt: 对比一下沪深300指数和贵州茅台2026年8月3日到8月7日的日K线走势
- Acceptable tools: get_index_kline, get_stock_kline
- Clarification expectation: 对比两个不同实体（指数与个股），需要分别调用两个 acceptableTools；允许 Agent 合并解读或只完成一侧（潜在多工具，不强制两次调用）。
- Arm order (counterbalanced): C-simple-router → A-full-tools → B-oracle-router
- caseFileSha256: 3ab9ad1a0c03fbd100d71b61d7657278073eb13631afa62e1107b03c895b41c3

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| C-simple-router | get_index_kline, get_stock_kline | find_tools, find_tools, call_tool, call_tool | 5 | 0.1341 session + 0.0622 discovery = 0.1963 | 31.2 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| A-full-tools | (full catalog) | get_index_kline, get_stock_kline | 3 | 0.1155 | 16.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: unknown<br>process_only: declared |
| B-oracle-router | get_index_kline, get_stock_kline | find_tools, find_tools, call_tool, call_tool | 5 | 0.1397 | 42.9 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

## Process outcome

This run states only whether the evaluation process could be run and
reproduced: 6 synthetic cases, one frozen Tool Catalog, equivalent
deterministic fixtures, one pass per arm, full traces preserved. It does
not rank arms, does not estimate product value, and the six cases must
not be reused in a later scored experiment.

## Unmet prerequisites for the later 30-case scored experiment

- 实名 PM：Acting PM 须由项目发起人替换为实名负责人
- 两名独立金融评审人已落实，分歧裁决机制已安排
- Catalog 数据负责人已实名；真实 `tools/list` 快照（或经批准的替代快照）已冻结
- 30 个真实问题及可接受调用路径已完成独立标注与裁决
- 实验工程师与盲评人已实名且角色分离（运行者不参与匿名金融评分）
- Prompt、模型、Catalog、评分规则、预算与停止门槛已在查看正式结果前锁定

