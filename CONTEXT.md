# MCP Tool Routing

This context describes how an agent discovers and invokes financial capabilities exposed by registered MCP servers. It deliberately excludes execution of multi-tool workflows.

## Routing Language

**Router**:
The MCP service that discovers registered tools and forwards a selected tool call to its owning upstream server.
_Avoid_: Gateway, workflow engine, orchestrator

**Upstream Server**:
A registered MCP server that owns and executes one or more atomic tools.
_Avoid_: Backend, provider

**Meta-tool**:
A Router-owned tool whose purpose is discovery or forwarding rather than financial data retrieval.

**Tool Catalog**:
The set of upstream tool definitions known to the Router at a point in time.
_Avoid_: Tool list, registry snapshot

**Candidate Tool**:
An atomic upstream tool returned by discovery as potentially suitable for the query.
_Avoid_: Recommendation, plan node

**Tool Reference**:
An opaque value issued by the Router that identifies the selected upstream tool for a later call. Callers must not construct or interpret it.
_Avoid_: Tool ID, server/tool path

## Financial Discovery Language

**Subject**:
The company, security, industry, market, or economy about which financial data is requested.
_Avoid_: Entity, target

**Metric**:
The normalized financial quantity being requested, independent of its reporting or calculation variant.
_Avoid_: Indicator, field

**Metric Variant**:
The accounting or analytical interpretation of a Metric, such as attributable, excluding non-recurring items, quarterly, cumulative, or TTM.
_Avoid_: Metric type

**Time**:
The temporal scope and observation basis of a request, including point-in-time, reporting period, range, and frequency.
_Avoid_: Date

**Data Kind**:
The nature of the requested data, such as disclosed actuals, forecasts, analyst estimates, model projections, or live market data.
_Avoid_: Data type

**Capability**:
A normalized description of what financial question a tool can answer, independent of its server-specific name.

## Orchestration Language

**Suggested Plan**:
An optional, advisory graph of atomic tool calls that an Agent may modify or ignore. It is not executed or state-managed by the Router.

**Workflow Runtime**:
A separate system that executes and persists multi-tool plans, including scheduling, retries, cancellation, and intermediate state.
_Avoid_: Router
