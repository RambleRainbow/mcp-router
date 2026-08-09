import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CASE_PATH,
  loadThreeArmCase,
} from "../evaluation/three-arm/case.js";
import { createOracleRouterServer } from "../evaluation/three-arm/oracle-server.js";

const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);

/**
 * Scripted MCP Client against the Oracle Router arm: the fixed
 * find_tools/call_tool interface returning the case's predeclared
 * acceptable Candidate Tool, backed by the frozen Tool Catalog.
 */
async function createOracleStack() {
  const server = createOracleRouterServer(armCase);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "scripted-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return { client };
}

describe("Oracle Router arm", () => {
  it("exposes exactly the fixed find_tools and call_tool Meta-tools", async () => {
    const { client } = await createOracleStack();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["call_tool", "find_tools"]);
  });

  it("find_tools returns the case's predeclared acceptable Candidate Tool from the frozen catalog", async () => {
    const { client } = await createOracleStack();
    const result = await client.callTool({
      name: "find_tools",
      arguments: { query: armCase.userPrompt },
    });
    const payload = result.structuredContent as {
      status: string;
      candidates: Array<{
        toolRef: string;
        name: string;
        description: string;
        inputSchema: { type: string };
      }>;
    };
    expect(payload.status).toBe("ready");
    expect(payload.candidates).toHaveLength(armCase.acceptableTools.length);
    expect(payload.candidates.map((c) => c.name)).toEqual(
      armCase.acceptableTools,
    );
    const candidate = payload.candidates[0]!;
    expect(candidate.inputSchema.type).toBe("object");
    expect(candidate.description.length).toBeGreaterThan(0);
  });

  it("call_tool returns the same deterministic case fixture as every other arm", async () => {
    const { client } = await createOracleStack();
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
    const payload = result.structuredContent as {
      mock: boolean;
      tool: string;
      data: unknown;
    };
    expect(payload.mock).toBe(true);
    expect(payload.tool).toBe("get_stock_kline");
    expect(payload.data).toEqual(armCase.resultFixture);
  });

  it("rejects an unknown Tool Reference with INVALID_TOOL_REF", async () => {
    const { client } = await createOracleStack();
    const result = await client.callTool({
      name: "call_tool",
      arguments: { toolRef: "tr_nonexistent", arguments: {} },
    });
    expect(result.isError).toBe(true);
    const payload = result.structuredContent as {
      error: { code: string };
    };
    expect(payload.error.code).toBe("INVALID_TOOL_REF");
  });
});
