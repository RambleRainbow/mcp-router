# Evaluation Harness

Experimental apparatus for the value-evaluation track (parent issue #5).
Nothing here is part of the frozen Router product (`src/`): no production
Catalog, ranking, multi-server, permission, persistence, or orchestration
behavior.

## Full Tools arm (issue #6)

Exposes the frozen AiFinMarket Tool Catalog — 34 upstream tool definitions
across the seven published server categories — directly over MCP, without
the Router's `find_tools`/`call_tool` Meta-tools. Every tool returns a
deterministic, explicitly mock result; no live Wind credentials are needed.

- `catalog/tool-catalog.json` — the frozen artifact. Derived from the
  vendored wind-skills snapshot (`catalog/wind-skills-source/`, revision
  `495884408b1da1f8d5fa55daa2b68fd510b02da3`; see its `SOURCE.md`). Every
  schema is derived from the public reference docs, not live `tools/list`
  output, and is marked per field with
  `"x-provenance": "derived-from-reference-docs"`. Source revision,
  transformation method, and artifact hash are recorded in `meta`.
- `catalog/build-catalog.mjs` — the deterministic transformation.
- `full-tools/server.ts` / `full-tools/stdio.ts` — the evaluation-only MCP
  server and its stdio entrypoint.
- `full-tools/verify.ts` — the scripted MCP Client.

## Reproduce

```bash
npm run eval:verify     # scripted Client: 34-tool count + schema shape + one representative mock call
npm run catalog:check   # artifact is in sync with the vendored source
npm test                # full suite, including the frozen Technical Spike tests
```

To rebuild the artifact from the vendored source:
`node evaluation/catalog/build-catalog.mjs`

To attach the Reference Agent to this arm, point an MCP config at
`npx tsx evaluation/full-tools/stdio.ts`.

## Three-arm process run (issue #7)

Runs one synthetic, **non-scored** financial case (`three-arm/case-001.json`)
once through each arm in a fresh Claude Code CLI process with
`claude-opus-5[1m]` over stdio:

- **A — Full Tools** (`three-arm/full-tools-stdio.ts`): the frozen catalog
  exposed directly.
- **B — Oracle Router** (`three-arm/oracle-stdio.ts`): the fixed
  `find_tools`/`call_tool` interface returning the case's predeclared
  acceptable Candidate Tool.
- **C — Simple Router** (`three-arm/simple-stdio.ts`): the same fixed
  interface, discovery via one frozen one-shot prompt
  (`three-arm/discovery-prompt.md`, hash-pinned) over only the query and the
  frozen catalog — at most three candidates, no per-case rules, retries,
  memory, or post-result tuning.

All arms share `full-tools/fixtures.ts`, so equivalent valid calls receive
the case's identical deterministic result fixture.

```bash
npm run eval:three-arm
```

Raw stream-json traces, parsed per-arm traces (candidates, call arguments,
tool results, final answer, token categories, cost, latency, errors), the
pinned configuration, and a human-readable `summary.md` land in
`three-arm/runs/<runId>/`. The run makes no claim that one arm is better
than another.
