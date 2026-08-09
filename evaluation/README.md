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
