# Three-Arm Process Run: One Synthetic Case Through All Evaluation Arms

**Date**: 2026-08-09
**Ticket**: #7 - Run one financial case through all three evaluation arms
**Status**: ✅ COMPLETE — three-arm comparison proven executable and measurable

---

## What Was Built

Evaluation-only harness under `evaluation/three-arm/` (no Router product change; `src/` untouched):

- **Case declaration** `case-001.json` — synthetic, explicitly NON-SCORED, clear single-tool case: 贵州茅台 2026-08-05..08-07 日 K 线 → `get_stock_kline`, with declared required/acceptable arguments, deterministic result fixture, and a process-only success rubric.
- **Arm A Full Tools** — frozen 34-tool catalog exposed directly (issue #6 server + optional case fixture).
- **Arm B Oracle Router** — fixed `find_tools`/`call_tool` interface (mirrors `src/router.ts` names/shapes/descriptions) returning the predeclared acceptable Candidate Tool.
- **Arm C Simple Router** — same fixed interface; discovery is one frozen one-shot prompt (`discovery-prompt.md`, sha256-pinned `32dc7b91e11e`) over only the query + frozen catalog, ≤3 candidates, no retries/memory/tuning.
- **Shared fixture resolver** `evaluation/full-tools/fixtures.ts` — identical deterministic result fixture for equivalent valid calls across arms.
- **Runner** `run.ts` — `npm run eval:three-arm` runs the case through all arms in fresh Claude Code CLI sessions and writes raw stream-json, parsed traces, `run.json`, `summary.md` to `evaluation/three-arm/runs/<runId>/`.

## Passing Run (evidence: `runs/2026-08-09T12-24-53-153Z-case-001/`)

| Arm | Tool calls | Turns | Cost (USD) | Rubric |
| --- | --- | --- | --- | --- |
| A Full Tools | `get_stock_kline` direct | 2 | 0.1007 | all pass |
| B Oracle Router | `find_tools` → `call_tool` | 3 | 0.1148 | all pass |
| C Simple Router | `find_tools` → `call_tool` | 3 | 0.1168 session + 0.0906 discovery = 0.2073 | all pass |

Total: $0.4228 across 3 fresh CLI sessions (discovery included).

Pinned configuration (recorded in `run.json`): model `claude-opus-5[1m]`, Claude Code CLI 2.1.226, code revision `23601f0`, catalog hash `sha256:f762824f…`, case file sha256, discovery prompt revision, stdio transport. `worktreeDirty: true` reflects two unrelated pre-existing local files (`to-questionnaire-*.md` WIP, one untracked transcript), not harness code.

Notable observations (not scored, no ranking): Simple Router's one-shot discovery returned exactly the acceptable tool; Oracle arm agent supplied extra schema-legal optional args (`aftype`/`issusp`), recorded as undeclared-but-allowed by the rubric.

## Iteration History

| Run | Outcome | Root cause | Fix |
| --- | --- | --- | --- |
| 1 | Arms B/C rubric `invoked_acceptable_tool=fail` despite correct agent behavior | Runner re-parsed the 500-char-truncated find_tools excerpt to map toolRef→tool name | Carry full `toolRefToName` from the parse stage into rubric evaluation |
| 2 (two-axis /code-review) | — | Mid-file imports; `kase` naming; case-path/model/catalogRevision literals duplicated; C-arm discovery cost excluded from totals; rubric evidence overclaimed "all args in declared ranges"; case file never stated required arguments; run.ts four responsibilities | All fixed in `23601f0` (see commit message); run.ts split into `trace.ts`/`rubric.ts` |
| 3 | ✅ PASS (evidence above) | — | — |

## Scope of What This Proves

The three-arm comparison can be executed and measured end to end: fresh Reference Agent sessions, held-constant prompt/catalog/fixture, captured candidates/arguments/results/answers/token categories/cost/latency/errors, one documented command, machine-readable + human-readable outputs.

It does **not** prove: any arm is better (explicitly non-scored); product value; real-data behavior (deterministic mocks); multi-case generality (one case).

## Next Steps (#8)

Expand to the six-case process MVP: 2 clear single-tool + 2 Metric Variant/Time ambiguity + 2 potential multi-tool cases, counterbalanced arm order, hard limits of 18 sessions / USD 10, honest partial-run recording, Acting PM review by 2026-08-14.
