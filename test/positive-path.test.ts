import { describe, expect, it } from "vitest";
import { createStack, discoverQuoteToolRef, QUOTE_QUERY } from "./stack.js";

describe("Router meta-tool exposure", () => {
  it("exposes exactly find_tools and call_tool through tools/list", async () => {
    const { client } = await createStack();

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "call_tool",
      "find_tools",
    ]);
  });
});

describe("find_tools discovery", () => {
  it("returns status ready with exactly one quote Candidate Tool for the quote query", async () => {
    const { client } = await createStack();

    const result = await client.callTool({
      name: "find_tools",
      arguments: { query: QUOTE_QUERY },
    });

    const payload = result.structuredContent as {
      status: string;
      candidates: Array<Record<string, unknown>>;
    };
    expect(payload.status).toBe("ready");
    expect(payload.candidates).toHaveLength(1);

    const candidate = payload.candidates[0]!;
    expect(candidate.name).toBe("get_latest_quote");
    expect(typeof candidate.description).toBe("string");
    expect(candidate.inputSchema).toMatchObject({
      type: "object",
      properties: { securityName: { type: "string" } },
      required: ["securityName"],
    });
    expect(typeof candidate.matchReason).toBe("string");
    expect(typeof candidate.toolRef).toBe("string");
    expect(candidate.toolRef).not.toContain("get_latest_quote");
  });
});

describe("call_tool forwarding", () => {
  it("forwards the call through MCP to the Mock Quote Upstream Server exactly once", async () => {
    const { client, router, upstream } = await createStack();

    const toolRef = await discoverQuoteToolRef(client);

    const result = await client.callTool({
      name: "call_tool",
      arguments: { toolRef, arguments: { securityName: "贵州茅台" } },
    });

    expect(result.isError).toBeFalsy();

    const content = result.content as Array<{ type: string; text?: string }>;
    expect(content[0]).toMatchObject({ type: "text" });
    expect(typeof content[0]!.text).toBe("string");

    expect(result.structuredContent).toEqual({
      securityName: "贵州茅台",
      securityCode: "600519.SH",
      latestPrice: 1488.2,
      currency: "CNY",
      asOf: "2026-08-09T15:00:00+08:00",
      mock: true,
    });

    expect(upstream.invocationCount()).toBe(1);

    expect(router.events).toEqual([
      { type: "query_received", query: QUOTE_QUERY },
      {
        type: "rule_matched",
        ruleId: "quote.snapshot:keyword:股价",
        toolName: "get_latest_quote",
      },
      { type: "tool_ref_issued", toolRef, toolName: "get_latest_quote" },
      {
        type: "call_tool_invoked",
        toolRef,
        arguments: { securityName: "贵州茅台" },
      },
      { type: "upstream_called", toolName: "get_latest_quote" },
    ]);
  });
});
