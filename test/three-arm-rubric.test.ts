import { describe, expect, it } from "vitest";
import type { ThreeArmCase } from "../evaluation/three-arm/case.js";
import { evaluateRubric } from "../evaluation/three-arm/rubric.js";
import type { ArmTrace } from "../evaluation/three-arm/trace.js";

/**
 * Process-only rubric evaluation for multi-tool cases (issue #8): every
 * invoked acceptable tool call is validated against that tool's own
 * expectations; an empty acceptable-value list means "any value, recorded
 * but not judged".
 */
const multiToolCase: ThreeArmCase = {
  caseId: "case-test",
  kind: "potential-multi-tool",
  scored: false,
  label: "NON-SCORED rubric test case",
  userPrompt: "对比沪深300指数与贵州茅台的日K线",
  acceptableTools: ["get_index_kline", "get_stock_kline"],
  clarification: "测试用例",
  toolExpectations: {
    get_index_kline: {
      requiredArguments: ["windcode", "begin_date", "end_date"],
      acceptableArguments: {
        windcode: ["000300.SH", "沪深300"],
        begin_date: ["2026-08-03"],
        end_date: ["2026-08-07"],
        period: ["1d"],
      },
      resultFixture: [{ date: "2026-08-03", close: 4100 }],
    },
    get_stock_kline: {
      requiredArguments: ["windcode", "begin_date", "end_date"],
      acceptableArguments: {
        windcode: ["600519.SH", "贵州茅台"],
        begin_date: ["2026-08-03"],
        end_date: ["2026-08-07"],
        period: ["1d"],
      },
      resultFixture: [{ date: "2026-08-03", close: 1490 }],
    },
  },
  successRubric: [{ id: "process_only", check: "只判断流程" }],
};

function makeTrace(overrides: Partial<ArmTrace>): ArmTrace {
  return {
    arm: "A-full-tools",
    prompt: multiToolCase.userPrompt,
    toolCalls: [],
    discoveredCandidates: null,
    toolRefToName: null,
    discoveryMeta: null,
    discoveryCostUsd: null,
    toolResults: [],
    finalAnswer: "这是 mock 数据",
    usage: null,
    costUsd: null,
    latencyMs: null,
    numTurns: null,
    errors: [],
    ...overrides,
  };
}

function verdict(
  results: Array<{ id: string; verdict: string }>,
  id: string,
): string {
  return results.find((r) => r.id === id)!.verdict;
}

const indexCall = {
  tool: "get_index_kline",
  arguments: {
    windcode: "000300.SH",
    begin_date: "2026-08-03",
    end_date: "2026-08-07",
    period: "1d",
  },
};
const stockCall = {
  tool: "get_stock_kline",
  arguments: {
    windcode: "600519.SH",
    begin_date: "2026-08-03",
    end_date: "2026-08-07",
  },
};

describe("multi-tool rubric evaluation", () => {
  it("passes when both acceptable tools are called with acceptable arguments (arm A)", () => {
    const trace = makeTrace({ toolCalls: [indexCall, stockCall] });
    const results = evaluateRubric(multiToolCase, "A-full-tools", trace);
    expect(verdict(results, "invoked_acceptable_tool")).toBe("pass");
    expect(verdict(results, "arguments_acceptable")).toBe("pass");
  });

  it("passes when only one of the acceptable tools is invoked", () => {
    const trace = makeTrace({ toolCalls: [stockCall] });
    const results = evaluateRubric(multiToolCase, "A-full-tools", trace);
    expect(verdict(results, "invoked_acceptable_tool")).toBe("pass");
    expect(verdict(results, "arguments_acceptable")).toBe("pass");
  });

  it("fails arguments when an invoked call violates its own tool's expectations", () => {
    const wrong = {
      tool: "get_stock_kline",
      arguments: {
        windcode: "000300.SH",
        begin_date: "2026-08-03",
        end_date: "2026-08-07",
      },
    };
    const trace = makeTrace({ toolCalls: [indexCall, wrong] });
    const results = evaluateRubric(multiToolCase, "A-full-tools", trace);
    expect(verdict(results, "invoked_acceptable_tool")).toBe("pass");
    expect(verdict(results, "arguments_acceptable")).toBe("fail");
    expect(
      results.find((r) => r.id === "arguments_acceptable")!.evidence,
    ).toContain("get_stock_kline");
  });

  it("fails arguments when a required argument is missing", () => {
    const missing = {
      tool: "get_index_kline",
      arguments: { windcode: "000300.SH", begin_date: "2026-08-03" },
    };
    const trace = makeTrace({ toolCalls: [missing] });
    const results = evaluateRubric(multiToolCase, "A-full-tools", trace);
    expect(verdict(results, "arguments_acceptable")).toBe("fail");
  });

  it("resolves acceptable invocations through call_tool toolRefs (arms B/C)", () => {
    const trace = makeTrace({
      arm: "B-oracle-router",
      toolRefToName: { tr_1: "get_index_kline", tr_2: "get_stock_kline" },
      toolCalls: [
        { tool: "find_tools", arguments: { query: "k线" } },
        {
          tool: "call_tool",
          arguments: { toolRef: "tr_1", arguments: indexCall.arguments },
        },
        {
          tool: "call_tool",
          arguments: { toolRef: "tr_2", arguments: stockCall.arguments },
        },
      ],
    });
    const results = evaluateRubric(multiToolCase, "B-oracle-router", trace);
    expect(verdict(results, "invoked_acceptable_tool")).toBe("pass");
    expect(verdict(results, "arguments_acceptable")).toBe("pass");
  });

  it("reports fail/unknown when no acceptable tool was invoked", () => {
    const trace = makeTrace({
      toolCalls: [
        { tool: "get_stock_quote", arguments: { windcode: "600519.SH" } },
      ],
    });
    const results = evaluateRubric(multiToolCase, "A-full-tools", trace);
    expect(verdict(results, "invoked_acceptable_tool")).toBe("fail");
    expect(verdict(results, "arguments_acceptable")).toBe("unknown");
  });

  it("treats an empty acceptable-value list as 'any value, recorded but not judged'", () => {
    const freeTextCase: ThreeArmCase = {
      ...multiToolCase,
      caseId: "case-free-text",
      acceptableTools: ["get_stock_fundamentals"],
      toolExpectations: {
        get_stock_fundamentals: {
          requiredArguments: ["question"],
          acceptableArguments: { question: [] },
          resultFixture: [{ roe: 0.3 }],
        },
      },
    };
    const trace = makeTrace({
      toolCalls: [
        {
          tool: "get_stock_fundamentals",
          arguments: { question: "贵州茅台最新ROE（任意表述）" },
        },
      ],
    });
    const results = evaluateRubric(freeTextCase, "A-full-tools", trace);
    expect(verdict(results, "invoked_acceptable_tool")).toBe("pass");
    expect(verdict(results, "arguments_acceptable")).toBe("pass");
  });
});
