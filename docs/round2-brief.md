# Round 2 - Technical Spike 验证计划（简版）

## 目标

**验证流程可行性 > 工具完美度**

## 技术决策

| 决策点 | 选择 |
|--------|------|
| **SDK** | TypeScript（Router + Mock Server） |
| **传输** | Agent→Router (stdio), Router→Mock (InMemoryTransport) |
| **验收** | 一正一负通过后冻结 |

## 最小验收

- ✅ 正例：正确查询 → 返回 mock 股价（`mock: true` 标记）
- ✅ 负例：缺少参数 → Router 校验拦截，不调用上游
- 可选诊断：无效 toolRef → 明确错误（不作为完成 Spike 的必需条件）

## 两关卡验证

1. **Gate 1**：脚本化 MCP Client → 排除协议问题
2. **Gate 2**：Claude Code CLI + `claude-opus-5[1m]` → 证明参考 Agent 能自主两阶段调用

Gate 2 和后续三组对照统一锁定 Claude Code CLI、`claude-opus-5[1m]` 和 stdio；结论不能直接推广到其他 Agent/Host。

## 完成后冻结

❌ 不再加：Claude 排序、多 Server、Security Master、权限、DAG、缓存、性能

✅ 只修复：阻碍实验的 bug

## 下一步：价值验证

### 样本准备（PM + 金融）

20-30 个真实问题：
- 15 个明确单工具
- 10 个混淆指标/口径/时间
- 5 个多工具

### 三组对照

| 组别 | 设置 | 验证 |
|------|------|------|
| A | 全量 Tools 基线 | Router 是否必要 |
| B | Oracle Router | 两阶段接口价值 |
| C | 简单 Router | 实际发现上限 |

### 决策矩阵

| 结果 | 下一步 |
|------|--------|
| Oracle 不优于全量 | 停止项目 |
| 选对工具但填参失败 | 治理 schema/描述 |
| 单工具成功多工具失败 | 不做 DAG |
| 成功率提升≥10个百分点，或 Token↓50% 且成功率下降≤5个百分点 | 接入真实上游 |

---

**详细版**: [round2-summary.md](./round2-summary.md)
