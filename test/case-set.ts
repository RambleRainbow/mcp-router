import { expect } from "vitest";
import type { ThreeArmCase } from "../evaluation/three-arm/case.js";
import { TOOL_CATALOG } from "../evaluation/full-tools/server.js";

/**
 * Shared per-case declaration consistency assertions for case-set tests
 * (process-MVP set and pilot set). Set-level expectations (size, kind
 * distribution, hard limits) stay in each set's own test file.
 */

const KNOWN_RUBRIC_IDS = new Set([
  "invoked_acceptable_tool",
  "arguments_acceptable",
  "reported_mock_data",
  "process_only",
]);

export function expectCaseDeclarationsConsistent(armCase: ThreeArmCase): void {
  const catalogNames = new Set(TOOL_CATALOG.map((t) => t.name));

  expect(armCase.scored, armCase.caseId).toBe(false);
  expect(armCase.userPrompt.length, armCase.caseId).toBeGreaterThan(0);
  expect(armCase.acceptableTools.length, armCase.caseId).toBeGreaterThan(0);
  for (const tool of armCase.acceptableTools) {
    expect(catalogNames, `${armCase.caseId}: ${tool}`).toContain(tool);
  }

  expect(
    Object.keys(armCase.toolExpectations).sort(),
    `${armCase.caseId}: toolExpectations must cover exactly the acceptable tools`,
  ).toEqual([...armCase.acceptableTools].sort());

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
    expect(
      [...expectation.requiredArguments].sort(),
      `${armCase.caseId}/${toolName}: requiredArguments must match the inputSchema`,
    ).toEqual([...(tool.inputSchema.required ?? [])].sort());
    for (const required of expectation.requiredArguments) {
      expect(
        expectation.acceptableArguments,
        `${armCase.caseId}/${toolName}: required argument ${required} has no declared acceptable values`,
      ).toHaveProperty(required);
    }
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
    expect(KNOWN_RUBRIC_IDS, `${armCase.caseId}: ${id}`).toContain(id);
  }
}
