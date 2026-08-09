import { describe, expect, it } from "vitest";
import {
  loadProcessSet,
  PROCESS_SET_PATH,
} from "../evaluation/three-arm/case.js";
import { TOOL_CATALOG } from "../evaluation/full-tools/server.js";

/**
 * The frozen process set (issue #8): exactly six synthetic, non-scored
 * cases — two clear single-tool, two Metric Variant / Time ambiguity, and
 * two potential multi-tool — with hard limits of 18 sessions / USD 10.
 */
describe("frozen process set (issue #8)", () => {
  const processSet = loadProcessSet(PROCESS_SET_PATH);
  const catalogNames = new Set(TOOL_CATALOG.map((t) => t.name));

  it("contains exactly six synthetic, non-scored cases with unique ids", () => {
    expect(processSet.cases.length).toBe(6);
    expect(new Set(processSet.cases.map((c) => c.caseId)).size).toBe(6);
    for (const armCase of processSet.cases) {
      expect(armCase.scored, armCase.caseId).toBe(false);
      expect(armCase.label, armCase.caseId).toContain("NON-SCORED");
      expect(armCase.userPrompt.length, armCase.caseId).toBeGreaterThan(0);
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

  it("every case declares acceptable tools that exist in the frozen catalog", () => {
    for (const armCase of processSet.cases) {
      expect(armCase.acceptableTools.length, armCase.caseId).toBeGreaterThan(0);
      for (const tool of armCase.acceptableTools) {
        expect(catalogNames, `${armCase.caseId}: ${tool}`).toContain(tool);
      }
    }
  });

  it("tool expectations cover exactly the acceptable tools", () => {
    for (const armCase of processSet.cases) {
      expect(
        Object.keys(armCase.toolExpectations).sort(),
        armCase.caseId,
      ).toEqual([...armCase.acceptableTools].sort());
    }
  });

  it("argument declarations are consistent with each tool's inputSchema", () => {
    for (const armCase of processSet.cases) {
      for (const [toolName, expectation] of Object.entries(
        armCase.toolExpectations,
      )) {
        const tool = TOOL_CATALOG.find((t) => t.name === toolName)!;
        const properties = tool.inputSchema.properties ?? {};
        for (const arg of Object.keys(expectation.acceptableArguments)) {
          expect(
            properties,
            `${armCase.caseId}/${toolName}: unknown argument ${arg}`,
          ).toHaveProperty(arg);
        }
        expect([...expectation.requiredArguments].sort()).toEqual(
          [...(tool.inputSchema.required ?? [])].sort(),
        );
        for (const required of expectation.requiredArguments) {
          expect(
            expectation.acceptableArguments,
            `${armCase.caseId}/${toolName}: required argument ${required} has no declared acceptable values`,
          ).toHaveProperty(required);
        }
      }
    }
  });

  it("declares deterministic result fixtures and a process-only rubric", () => {
    const knownRubricIds = new Set([
      "invoked_acceptable_tool",
      "arguments_acceptable",
      "reported_mock_data",
      "process_only",
    ]);
    for (const armCase of processSet.cases) {
      for (const [toolName, expectation] of Object.entries(
        armCase.toolExpectations,
      )) {
        expect(
          expectation.resultFixture,
          `${armCase.caseId}/${toolName}`,
        ).toBeDefined();
        expect(
          JSON.parse(JSON.stringify(expectation.resultFixture)),
          `${armCase.caseId}/${toolName}: fixture must be JSON-serializable`,
        ).toEqual(expectation.resultFixture);
      }
      const rubricIds = armCase.successRubric.map((r) => r.id);
      expect(rubricIds, armCase.caseId).toContain("process_only");
      for (const id of rubricIds) {
        expect(knownRubricIds, `${armCase.caseId}: ${id}`).toContain(id);
      }
    }
  });
});
