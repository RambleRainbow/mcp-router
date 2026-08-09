import { describe, expect, it } from "vitest";
import {
  DEFAULT_CASE_PATH,
  loadThreeArmCase,
} from "../evaluation/three-arm/case.js";
import { resolveMockResult } from "../evaluation/full-tools/fixtures.js";
import { TOOL_CATALOG } from "../evaluation/full-tools/server.js";


describe("three-arm synthetic case declaration", () => {
  const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);

  it("is explicitly synthetic and non-scored", () => {
    expect(armCase.scored).toBe(false);
    expect(armCase.label).toContain("NON-SCORED");
    expect(armCase.userPrompt.length).toBeGreaterThan(0);
  });

  it("declares acceptable tools that exist in the frozen Tool Catalog", () => {
    const names = new Set(TOOL_CATALOG.map((t) => t.name));
    expect(armCase.acceptableTools.length).toBeGreaterThan(0);
    for (const tool of armCase.acceptableTools) {
      expect(names).toContain(tool);
    }
  });

  it("declares acceptable arguments consistent with the tool's inputSchema", () => {
    const tool = TOOL_CATALOG.find((t) => t.name === armCase.acceptableTools[0])!;
    const properties = tool.inputSchema.properties ?? {};
    for (const arg of Object.keys(armCase.acceptableArguments)) {
      expect(properties, `unknown argument ${arg}`).toHaveProperty(arg);
    }
    for (const required of tool.inputSchema.required ?? []) {
      expect(
        armCase.acceptableArguments,
        `required argument ${required} has no declared acceptable values`,
      ).toHaveProperty(required);
    }
    expect([...armCase.requiredArguments].sort()).toEqual(
      [...(tool.inputSchema.required ?? [])].sort(),
    );
    for (const required of armCase.requiredArguments) {
      expect(
        armCase.acceptableArguments,
        `case-required argument ${required} has no declared acceptable values`,
      ).toHaveProperty(required);
    }
  });

  it("declares a deterministic result fixture and a process-only rubric", () => {
    expect(armCase.resultFixture).toBeDefined();
    expect(JSON.parse(JSON.stringify(armCase.resultFixture))).toEqual(
      armCase.resultFixture,
    );
    expect(armCase.successRubric.length).toBeGreaterThan(0);
    expect(armCase.successRubric.map((r) => r.id)).toContain("process_only");
  });
});

describe("shared deterministic mock resolver", () => {
  const kline = TOOL_CATALOG.find((t) => t.name === "get_stock_kline")!;
  const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);
  const args = {
    windcode: "600519.SH",
    begin_date: "2026-08-05",
    end_date: "2026-08-07",
  };

  it("returns the case's deterministic fixture for the case tool, identically for equivalent calls", () => {
    const first = resolveMockResult(kline, args, armCase);
    const equivalent = resolveMockResult(
      kline,
      { windcode: "贵州茅台", begin_date: "2026-08-05", end_date: "2026-08-07" },
      armCase,
    );
    expect(first.mock).toBe(true);
    expect(first.data).toEqual(armCase.resultFixture);
    expect(equivalent.data).toEqual(armCase.resultFixture);
    expect(first.note).toBe(equivalent.note);
  });

  it("keeps the generic empty-data envelope for tools without a case fixture", () => {
    const other = TOOL_CATALOG.find((t) => t.name === "get_stock_quote")!;
    const result = resolveMockResult(other, { windcode: "600519.SH" }, armCase);
    expect(result.mock).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("defaults to the generic envelope when no case is provided", () => {
    const result = resolveMockResult(kline, args);
    expect(result.mock).toBe(true);
    expect(result.data).toEqual([]);
  });
});
