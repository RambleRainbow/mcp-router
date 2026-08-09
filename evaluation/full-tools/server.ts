import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Evaluation-only Full Tools arm (issue #6): exposes the frozen AiFinMarket
 * Tool Catalog directly through `tools/list`, without the Router's
 * `find_tools`/`call_tool` Meta-tools. Every tool returns a deterministic,
 * explicitly mock result — no live Wind data, no credentials required.
 * Not part of the frozen Router product.
 */

/** One frozen tool definition from the catalog artifact. */
export interface CatalogTool {
  name: string;
  serverCategory: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };
  provenance: { schemaSource: string; note: string; referenceFile: string };
}

/** The frozen AiFinMarket Tool Catalog artifact (34 tools, issue #6). */
export const TOOL_CATALOG = (
  JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../catalog/tool-catalog.json"),
      "utf8",
    ),
  ) as { tools: CatalogTool[] }
).tools;

/** Creates the evaluation-only Full Tools MCP Server over the frozen catalog. */
export function createFullToolsServer(): Server {
  const toolsByName = new Map(TOOL_CATALOG.map((tool) => [tool.name, tool]));

  const server = new Server(
    { name: "aifinmarket-full-tools-eval", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_CATALOG.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolsByName.get(request.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `UNKNOWN_TOOL: ${request.params.name} is not in the frozen AiFinMarket Tool Catalog`,
          },
        ],
      };
    }

    const mockPayload = {
      mock: true,
      note: "Evaluation-only deterministic mock; no live Wind data was queried.",
      tool: tool.name,
      serverCategory: tool.serverCategory,
      arguments: request.params.arguments ?? {},
      data: [],
    };
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(mockPayload) },
      ],
      structuredContent: mockPayload,
    };
  });

  return server;
}
