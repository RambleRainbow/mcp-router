import { describe, expect, it } from "vitest";
import {
  parseArmTrace,
  parseStreamEvents,
} from "../evaluation/three-arm/trace.js";

/**
 * stream-json parsing for multi-find_tools sessions (issue #8): when the
 * Agent calls find_tools more than once, Tool Reference mappings must
 * accumulate across results — later results must not wipe earlier refs that
 * call_tool still uses.
 */
function findToolsResultEvent(
  toolUseId: string,
  candidates: Array<{ toolRef: string; name: string }>,
) {
  return {
    type: "user",
    message: {
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          content: JSON.stringify({ status: "ready", candidates }),
        },
      ],
    },
  };
}

function toolUseEvent(id: string, name: string, input: Record<string, unknown>) {
  return {
    type: "assistant",
    message: { content: [{ type: "tool_use", id, name, input }] },
  };
}

describe("parseArmTrace with repeated find_tools", () => {
  it("keeps Tool Reference mappings from every find_tools result", () => {
    const events = [
      toolUseEvent("u1", "mcp__oracle__find_tools", { query: "行情快照" }),
      findToolsResultEvent("u1", [
        { toolRef: "tr_first_1", name: "get_stock_price_indicators" },
      ]),
      toolUseEvent("u2", "mcp__oracle__find_tools", { query: "股东" }),
      findToolsResultEvent("u2", [
        { toolRef: "tr_second_1", name: "get_stock_equity_holders" },
      ]),
      toolUseEvent("u3", "mcp__oracle__call_tool", {
        toolRef: "tr_first_1",
        arguments: { windcode: "贵州茅台" },
      }),
      toolUseEvent("u4", "mcp__oracle__call_tool", {
        toolRef: "tr_second_1",
        arguments: { question: "前十大股东" },
      }),
    ] as const;

    const trace = parseArmTrace(
      "B-oracle-router",
      parseStreamEvents(events.map((e) => JSON.stringify(e)).join("\n")),
      null,
      1000,
      "查一下贵州茅台的最新行情快照，再看看它的前十大股东情况",
    );

    expect(trace.toolRefToName).toEqual({
      tr_first_1: "get_stock_price_indicators",
      tr_second_1: "get_stock_equity_holders",
    });
    expect(trace.discoveredCandidates).toEqual([
      "get_stock_price_indicators",
      "get_stock_equity_holders",
    ]);
  });

  it("unions duplicate candidate names across find_tools results", () => {
    const events = [
      toolUseEvent("u1", "mcp__simple__find_tools", { query: "k线" }),
      findToolsResultEvent("u1", [
        { toolRef: "tr_a", name: "get_stock_kline" },
      ]),
      toolUseEvent("u2", "mcp__simple__find_tools", { query: "k线 again" }),
      findToolsResultEvent("u2", [
        { toolRef: "tr_b", name: "get_stock_kline" },
      ]),
    ] as const;

    const trace = parseArmTrace(
      "C-simple-router",
      parseStreamEvents(events.map((e) => JSON.stringify(e)).join("\n")),
      null,
      1000,
      "日K线",
    );

    expect(trace.discoveredCandidates).toEqual(["get_stock_kline"]);
    expect(trace.toolRefToName).toEqual({
      tr_a: "get_stock_kline",
      tr_b: "get_stock_kline",
    });
  });
});
