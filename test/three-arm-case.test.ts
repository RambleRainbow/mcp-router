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

  it("declares per-tool expectations consistent with the tool's inputSchema", () => {
    expect(Object.keys(armCase.toolExpectations).sort()).toEqual(
      [...armCase.acceptableTools].sort(),
    );
    for (const [toolName, expectation] of Object.entries(
      armCase.toolExpectations,
    )) {
      const tool = TOOL_CATALOG.find((t) => t.name === toolName)!;
      const properties = tool.inputSchema.properties ?? {};
      for (const arg of Object.keys(expectation.acceptableArguments)) {
        expect(properties, `unknown argument ${arg}`).toHaveProperty(arg);
      }
      expect([...expectation.requiredArguments].sort()).toEqual(
        [...(tool.inputSchema.required ?? [])].sort(),
      );
      for (const required of expectation.requiredArguments) {
        expect(
          expectation.acceptableArguments,
          `case-required argument ${required} has no declared acceptable values`,
        ).toHaveProperty(required);
      }
    }
  });

  it("declares a deterministic result fixture and a process-only rubric", () => {
    for (const expectation of Object.values(armCase.toolExpectations)) {
      expect(expectation.resultFixture).toBeDefined();
      expect(JSON.parse(JSON.stringify(expectation.resultFixture))).toEqual(
        expectation.resultFixture,
      );
    }
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
    expect(first.data).toEqual(
      armCase.toolExpectations["get_stock_kline"]!.resultFixture,
    );
    expect(equivalent.data).toEqual(
      armCase.toolExpectations["get_stock_kline"]!.resultFixture,
    );
    expect(first.note).toBe(equivalent.note);
  });

  it("returns each acceptable tool its own fixture in a multi-tool case", () => {
    const multiToolCase = {
      ...armCase,
      acceptableTools: ["get_index_kline", "get_stock_kline"],
      toolExpectations: {
        get_index_kline: {
          requiredArguments: ["windcode", "begin_date", "end_date"],
          acceptableArguments: { windcode: ["000300.SH"] },
          resultFixture: [{ index: "csi300" }],
        },
        get_stock_kline: {
          requiredArguments: ["windcode", "begin_date", "end_date"],
          acceptableArguments: { windcode: ["600519.SH"] },
          resultFixture: [{ stock: "moutai" }],
        },
      },
    };
    const indexTool = TOOL_CATALOG.find((t) => t.name === "get_index_kline")!;
    expect(resolveMockResult(indexTool, {}, multiToolCase).data).toEqual([
      { index: "csi300" },
    ]);
    expect(resolveMockResult(kline, {}, multiToolCase).data).toEqual([
      { stock: "moutai" },
    ]);
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
