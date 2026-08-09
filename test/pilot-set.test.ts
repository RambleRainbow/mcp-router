import { describe, expect, it } from "vitest";
import { loadProcessSet } from "../evaluation/three-arm/case.js";
import { expectCaseDeclarationsConsistent } from "./case-set.js";

/**
 * The directional pilot set: five real-style financial questions previewing
 * the end-to-end effect ahead of the formal #5 experiment. Directional
 * only — not the scored experiment.
 */
const PILOT_SET_PATH = "evaluation/pilot/pilot-set.json";

describe("directional pilot set", () => {
  const pilotSet = loadProcessSet(PILOT_SET_PATH);

  it("contains exactly five non-scored cases with unique ids", () => {
    expect(pilotSet.cases.length).toBe(5);
    expect(new Set(pilotSet.cases.map((c) => c.caseId)).size).toBe(5);
    expect(pilotSet.scored).toBe(false);
    for (const armCase of pilotSet.cases) {
      expect(armCase.label, armCase.caseId).toContain("DIRECTIONAL");
    }
  });

  it("spans the representative and challenge strata", () => {
    const kinds = pilotSet.cases.map((c) => c.kind);
    expect(kinds.filter((k) => k === "representative").length).toBe(2);
    expect(kinds.filter((k) => k.startsWith("challenge-")).length).toBe(3);
    expect(kinds).toContain("challenge-metric-variant");
    expect(kinds).toContain("challenge-time");
    expect(kinds).toContain("challenge-multi-tool");
  });

  it("declares hard limits of 15 sessions and USD 5", () => {
    expect(pilotSet.hardLimits.maxSessions).toBe(15);
    expect(pilotSet.hardLimits.maxCostUsd).toBe(5);
  });

  it("declares a custom report footer recording the pilot's deviations", () => {
    expect(pilotSet.reportFooter).toBeDefined();
    expect(pilotSet.reportFooter!.join("\n")).toContain("directional");
  });

  it("every case declaration is consistent with the frozen catalog", () => {
    for (const armCase of pilotSet.cases) {
      expectCaseDeclarationsConsistent(armCase);
    }
  });
});
