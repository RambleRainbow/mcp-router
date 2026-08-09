# Three-Arm Run 2026-08-09T12-24-53-153Z-case-001

**NON-SCORED** — NON-SCORED process-validation case; makes no claim that any arm is better than another

## Pinned configuration

```json
{
  "model": "claude-opus-5[1m]",
  "cliVersion": "2.1.226 (Claude Code)",
  "codeRevision": "23601f09a257f038f330539010c651163fd630ee",
  "worktreeDirty": true,
  "catalogHash": "sha256:f762824f0c93765488cfb6775fca0521830cf408099362f05cd37f97cb73a444",
  "caseFileSha256": "9a3b43978f900e07a58c37febec08d082fd2c66cd368dcbd9167abb68f8928cd",
  "simpleRouterDiscoveryPromptRevision": "32dc7b91e11e",
  "simpleRouterDiscoveryModel": "claude-opus-5[1m]",
  "transport": "stdio",
  "casePath": "evaluation/three-arm/case-001.json"
}
```

## Case: case-001 (clear-single-tool)

- User prompt: 帮我查一下贵州茅台2026年8月5日到8月7日的日K线数据
- Acceptable tools: get_stock_kline

## Arms

| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |
| --- | --- | --- | --- | --- | --- | --- |
| A-full-tools | (full catalog) | get_stock_kline | 2 | 0.1007 | 7.6 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| B-oracle-router | get_stock_kline | find_tools, call_tool | 3 | 0.1148 | 7.8 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |
| C-simple-router | get_stock_kline | find_tools, call_tool | 3 | 0.1168 session + 0.0906 discovery = 0.2073 | 18.1 | invoked_acceptable_tool: pass<br>arguments_acceptable: pass<br>reported_mock_data: pass<br>process_only: declared |

Total: $0.4228 across 3 fresh CLI sessions (Simple Router discovery call included).

This run proves only that the three-arm comparison can be executed and
measured. It does not rank arms and makes no product-value claim.
