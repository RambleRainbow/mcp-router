import { describe, expect, it } from "vitest";
import { renderSummary, type RunSummary } from "../evaluation/three-arm/summary.js";

/**
 * Summary rendering for the process-MVP run (issue #8): hard-limit
 * accounting must distinguish arm sessions (the 18-session limit counts one
 * per case × arm) from Simple Router discovery CLI calls, and must never
 * rank arms.
 */
function makeRun(overrides: Partial<RunSummary["completeness"]> = {}): RunSummary {
  return {
    runId: "test-run",
    label: "NON-SCORED test",
    scored: false,
    processSet: {
      setId: "process-mvp-test",
      hardLimits: { maxSessions: 18, maxCostUsd: 10 },
      caseIds: ["case-001", "case-002", "case-003", "case-004", "case-005", "case-006"],
    },
    pinnedConfig: { model: "claude-opus-5[1m]" },
    completeness: {
      complete: true,
      stopReason: null,
      sessionsUsed: 18,
      discoveryCalls: 6,
      costUsd: 2.5,
      skipped: [],
      ...overrides,
    },
    cases: [],
  };
}

describe("renderSummary hard-limit accounting", () => {
  it("reports arm sessions and discovery CLI calls as separate counts", () => {
    const summary = renderSummary(makeRun());
    expect(summary).toContain("Arm sessions used: 18 / 18");
    expect(summary).toContain("Simple Router discovery CLI calls: 6");
    expect(summary).toContain("$2.5000 / $10");
  });

  it("records a partial run honestly with its skipped arms", () => {
    const summary = renderSummary(
      makeRun({
        complete: false,
        stopReason: "费用硬上限 $10 已达",
        sessionsUsed: 12,
        discoveryCalls: 4,
        skipped: [{ caseId: "case-005", arm: "A-full-tools", reason: "费用硬上限 $10 已达" }],
      }),
    );
    expect(summary).toContain("**partial**");
    expect(summary).toContain("case-005/A-full-tools");
  });

  it("states a process-only outcome and never ranks arms", () => {
    const summary = renderSummary(makeRun());
    expect(summary).toContain("does");
    expect(summary).not.toMatch(/arm [ABC] (is|wins|best|better)/i);
    expect(summary).not.toContain("更优");
  });
});
