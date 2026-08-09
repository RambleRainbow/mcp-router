import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createFullToolsServer } from "../evaluation/full-tools/server.js";

/**
 * Scripted MCP Client against the evaluation-only Full Tools arm: the frozen
 * AiFinMarket Tool Catalog exposed directly, without the Router's Meta-tools.
 */
async function createFullToolsStack() {
  const server = createFullToolsServer();
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "scripted-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return { client, server };
}

describe("evaluation-only Full Tools arm", () => {
  it("lists exactly the 34 frozen catalog tools directly, with no Router Meta-tools", async () => {
    const { client } = await createFullToolsStack();
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(34);
    const names = tools.map((t) => t.name);
    expect(names).not.toContain("find_tools");
    expect(names).not.toContain("call_tool");
    expect(names).toContain("get_stock_quote");

    for (const tool of tools) {
      expect(tool.description?.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe("object");
      for (const schema of Object.values(
        tool.inputSchema.properties ?? {},
      ) as Array<Record<string, unknown>>) {
        expect(schema["x-provenance"]).toBe("derived-from-reference-docs");
      }
    }
  });

  it("invokes one representative atomic tool and returns a deterministic, explicitly mock result", async () => {
    const { client } = await createFullToolsStack();
    const args = {
      windcode: "600519.SH",
      begin: "2026-08-06",
      end: "2026-08-06",
    };

    const first = await client.callTool({ name: "get_stock_quote", arguments: args });
    const second = await client.callTool({ name: "get_stock_quote", arguments: args });

    expect(first.isError).toBeFalsy();
    const payload = first.structuredContent as {
      mock: boolean;
      tool: string;
      serverCategory: string;
      arguments: Record<string, unknown>;
    };
    expect(payload.mock).toBe(true);
    expect(payload.tool).toBe("get_stock_quote");
    expect(payload.serverCategory).toBe("stock_data");
    expect(payload.arguments).toEqual(args);
    expect(second.structuredContent).toEqual(payload);
  });

  it("rejects calls to tools outside the frozen catalog", async () => {
    const { client } = await createFullToolsStack();
    const result = await client.callTool({
      name: "get_stock_quote_v2",
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });
});
