import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CASE_PATH,
  loadThreeArmCase,
} from "../evaluation/three-arm/case.js";
import {
  buildDiscoveryPrompt,
  type DiscoverFn,
} from "../evaluation/three-arm/discovery.js";
import { createSimpleRouterServer } from "../evaluation/three-arm/simple-server.js";
import { TOOL_CATALOG } from "../evaluation/full-tools/server.js";

const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);

/**
 * Scripted MCP Client against the Simple Router arm: the fixed
 * find_tools/call_tool interface whose discovery is a single frozen
 * one-shot prompt over the query and the frozen Tool Catalog. The LLM
 * discovery function is injected so tests stay deterministic.
 */
async function createSimpleStack(discover: DiscoverFn) {
  const server = createSimpleRouterServer(armCase, discover);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "scripted-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return { client };
}

describe("Simple Router arm", () => {
  it("exposes exactly the fixed find_tools and call_tool Meta-tools", async () => {
    const { client } = await createSimpleStack(async () => ({ names: ["get_stock_kline"] }));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["call_tool", "find_tools"]);
  });

  it("find_tools returns at most three Candidate Tools drawn from the frozen catalog", async () => {
    const discovered = ["get_stock_kline", "get_stock_quote", "get_stock_price_indicators", "get_stock_technicals"];
    const { client } = await createSimpleStack(async () => ({ names: discovered }));
    const result = await client.callTool({
      name: "find_tools",
      arguments: { query: armCase.userPrompt },
    });
    const payload = result.structuredContent as {
      status: string;
      candidates: Array<{ name: string; toolRef: string }>;
    };
    expect(payload.status).toBe("ready");
    expect(payload.candidates.length).toBeLessThanOrEqual(3);
    const catalogNames = new Set(TOOL_CATALOG.map((t) => t.name));
    for (const candidate of payload.candidates) {
      expect(catalogNames).toContain(candidate.name);
    }
  });

  it("honestly drops hallucinated tool names instead of retrying or inventing tools", async () => {
    const { client } = await createSimpleStack(async () => ({
      names: ["get_kline_ultra", "get_stock_kline"],
    }));
    const result = await client.callTool({
      name: "find_tools",
      arguments: { query: armCase.userPrompt },
    });
    const payload = result.structuredContent as {
      candidates: Array<{ name: string }>;
    };
    expect(payload.candidates.map((c) => c.name)).toEqual(["get_stock_kline"]);
  });

  it("call_tool returns the same deterministic case fixture as every other arm", async () => {
    const { client } = await createSimpleStack(async () => ({ names: ["get_stock_kline"] }));
    const discovery = await client.callTool({
      name: "find_tools",
      arguments: { query: armCase.userPrompt },
    });
    const { candidates } = discovery.structuredContent as {
      candidates: Array<{ toolRef: string }>;
    };
    const result = await client.callTool({
      name: "call_tool",
      arguments: {
        toolRef: candidates[0]!.toolRef,
        arguments: {
          windcode: "600519.SH",
          begin_date: "2026-08-05",
          end_date: "2026-08-07",
        },
      },
    });
    const payload = result.structuredContent as { mock: boolean; data: unknown };
    expect(payload.mock).toBe(true);
    expect(payload.data).toEqual(
      armCase.toolExpectations["get_stock_kline"]!.resultFixture,
    );
  });
});

describe("frozen one-shot discovery prompt", () => {
  it("embeds the query and every frozen catalog tool, and caps results at three", () => {
    const prompt = buildDiscoveryPrompt(armCase.userPrompt, TOOL_CATALOG);
    expect(prompt).toContain(armCase.userPrompt);
    for (const tool of TOOL_CATALOG) {
      expect(prompt).toContain(tool.name);
    }
    expect(prompt).toMatch(/3/);
  });

  it("is a pure function of query and catalog — frozen, no per-case rules", () => {
    expect(buildDiscoveryPrompt("q", TOOL_CATALOG)).toBe(
      buildDiscoveryPrompt("q", TOOL_CATALOG),
    );
  });
});
