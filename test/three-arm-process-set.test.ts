import { describe, expect, it } from "vitest";
import {
  loadProcessSet,
  PROCESS_SET_PATH,
} from "../evaluation/three-arm/case.js";
import { expectCaseDeclarationsConsistent } from "./case-set.js";

/**
 * The frozen process set (issue #8): exactly six synthetic, non-scored
 * cases — two clear single-tool, two Metric Variant / Time ambiguity, and
 * two potential multi-tool — with hard limits of 18 sessions / USD 10.
 */
describe("frozen process set (issue #8)", () => {
  const processSet = loadProcessSet(PROCESS_SET_PATH);

  it("contains exactly six synthetic, non-scored cases with unique ids", () => {
    expect(processSet.cases.length).toBe(6);
    expect(new Set(processSet.cases.map((c) => c.caseId)).size).toBe(6);
    for (const armCase of processSet.cases) {
      expect(armCase.label, armCase.caseId).toContain("NON-SCORED");
    }
  });

  it("matches the declared kind distribution 2 / 2 / 2", () => {
    const kinds = processSet.cases.map((c) => c.kind);
    expect(kinds.filter((k) => k === "clear-single-tool").length).toBe(2);
    expect(
      kinds.filter((k) =>
        ["metric-variant-ambiguity", "time-ambiguity"].includes(k),
      ).length,
    ).toBe(2);
    expect(kinds.filter((k) => k === "potential-multi-tool").length).toBe(2);
  });

  it("declares hard limits of 18 sessions and USD 10", () => {
    expect(processSet.hardLimits.maxSessions).toBe(18);
    expect(processSet.hardLimits.maxCostUsd).toBe(10);
  });

  it("resolves a declaration path per case", () => {
    expect(processSet.casePaths.length).toBe(6);
    for (const path of processSet.casePaths) {
      expect(path).toMatch(/^evaluation\/three-arm\/case-00[1-6]\.json$/);
    }
  });

  it("every case declaration is consistent with the frozen catalog", () => {
    for (const armCase of processSet.cases) {
      expectCaseDeclarationsConsistent(armCase);
    }
  });
});
