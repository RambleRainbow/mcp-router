# MCP Router 价值验证流程 MVP：发现问卷

**Purpose:** 用最小成本确认价值验证流程由谁推动、使用什么 Tool Catalog、如何完成一次不计分的试运行，以及何时才进入真实金融问题实验。

**From:** MCP Router 项目组 — **To:** 价值验证负责人（PM，负责协调金融团队、AiFinMarket 数据负责人和实验工程师） — **How your answers will be used:** 补全 GitHub 规格 #5，形成流程 MVP 的负责人、时间表和启动条件；本问卷不会直接启动正式价值实验。

## Context

MCP Router 的 Technical Spike 已完成并冻结：脚本化 Client 和 Claude Code Reference Agent 都已验证 `find_tools` → `call_tool` 两阶段链路。下一阶段原计划使用 20–30 个真实金融问题，对比 Full Tools、Oracle Router 和 Simple Router。当前只验证这套实验流程能否组织和运行，不验证 Router 的业务价值，也不要求现在准备真实问题或生产级金融数据。

## How to answer

请在 2 个工作日内填写，预计需要 15–20 分钟。简短回答即可；“尚未确定”也是有效答案，但请注明由谁、在什么时间点补充。

## 责任与决策权

### 谁是价值验证阶段的唯一负责人？

_Why this matters: 该负责人负责冻结实验协议，并对继续或停止项目作出最终决定。_

>

### 谁负责在正式实验前协调金融领域评审？

>

### 谁负责确认 AiFinMarket Tool Catalog 的来源和可用权限？

>

### 谁负责运行评测脚本并保存完整调用轨迹？

>

## 流程 MVP 范围

### 是否同意流程 MVP 只使用 6–10 个非正式、非计分问题？

_Why this matters: 这些问题只用于验证样本录入、Catalog 冻结、三组配置、日志采集和盲评交接，不得用于证明产品价值。_

>

### 流程 MVP 是否可以使用万得公开的近真实 Tool Catalog？

_Why this matters: 如果不允许，就必须先安排具备权限的负责人抓取真实 MCP `tools/list` 快照。_

>

### 流程 MVP 最晚应在什么日期完成？

>

### 流程 MVP 可接受的 Claude 调用预算是多少？

>

## 完成与升级条件

### 哪位负责人验收流程 MVP？

>

### 是否接受以下流程 MVP 完成定义？

_Why this matters: 明确停止条件可以防止试运行演变成未获授权的产品开发。_

建议完成定义：负责人和时间表已记录；一份 Tool Catalog 已冻结并留有来源；6–10 个非计分问题能够依次通过 A/B/C 三种配置；每次运行能保存候选工具、调用参数、最终回答、Token、费用和延迟；未修改冻结的 Router 产品代码。

>

### 满足什么条件后，才允许启动 30 个真实金融问题的正式实验？

>

## Anything else?

是否存在尚未提及、但会阻止流程 MVP 启动或验收的信息、审批或资源？

>
