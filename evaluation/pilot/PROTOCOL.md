# Directional Pilot Protocol (frozen 2026-08-09)

**Status:** frozen before any pilot results were viewed. Any later change
invalidates the hashes below and must be recorded as a new protocol
revision.

**What this is:** a 5-question directional preview of the end-to-end effect
("先看效果"), run at the Acting PM's request. **What it is not:** the #5
scored experiment. Its results are directional only and must not feed the
formal 30-case scored set.

## Frozen parameters

| Parameter | Value |
| --- | --- |
| Arms | A — Full Tools; B — Oracle Router; C — Simple Router (same definitions as evaluation/three-arm) |
| Reference Agent | Claude Code CLI, `claude-opus-5[1m]`, stdio, fresh process per case × arm |
| Tool Catalog | frozen public wind-skills fallback, `sha256:f762824f0c93765488cfb6775fca0521830cf408099362f05cd37f97cb73a444` |
| Discovery prompt | `evaluation/three-arm/discovery-prompt.md`, revision `32dc7b91e11e` (sha256 `32dc7b91e11eb027369f479dfaafb52095dd37b13bfc4548f3e812c12f941d80`) |
| Case set | `evaluation/pilot/pilot-set.json` + 5 case files, set sha256 `254ca23aedc96d32d34e1755640a0d552a9628954fa229dcfb24aacb912c128d` |
| Repetitions | 1 per case × arm (15 arm sessions) |
| Hard limits | 15 arm sessions / USD 5 (discovery calls count toward cost only) |
| Completion measure | mechanical proxy only: acceptable tool invoked with declared arguments + fixture data reported (process-only rubric) |

## Personnel (honest record)

| Role | Filled by |
| --- | --- |
| Acting PM (protocol freeze, acceptance) | hongling — repo owner |
| Experiment engineer (runs, traces) | hongling — same person, recorded |
| Financial reviewers (gold labels) | **deviation:** no two independent reviewers; labels drafted by LLM, adjudicated by the Acting PM alone |
| Blinded scorer | **deviation:** none; mechanical rubric + Acting PM review |
| Tool Catalog data owner | **unfilled:** live AiFinMarket `tools/list` snapshot not captured; public fallback used |

Named humans beyond the Acting PM were deliberately NOT fabricated (the
questionnaire forbids inventing names). These deviations are exactly why
this pilot cannot satisfy #5's acceptance criteria.

## Decision rule

None. The #5 pre-registered rule (±10pp completion / ≤5pp with ≥50% token
reduction) has no statistical meaning at n=5 with one repetition. This run
reports per-case mechanical completion, tokens, cost, and latency so the
Acting PM can preview the effect and adjust; no continue/stop decision may
be derived from it.

## Boundaries carried over from the process MVP

- Frozen Router product (`src/`) is not modified for the pilot.
- The five pilot cases must not be merged into the formal scored set.
- No per-case tuning of the Simple Router based on pilot results; the
  discovery prompt and selector model stay frozen.
