import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ThreeArmCase } from "../three-arm/case.js";
import { resolveMockResult } from "./fixtures.js";

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

const CATALOG_ARTIFACT = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../catalog/tool-catalog.json"),
    "utf8",
  ),
) as { meta: { artifactHash: string }; tools: CatalogTool[] };

/** The frozen AiFinMarket Tool Catalog artifact (34 tools, issue #6). */
export const TOOL_CATALOG = CATALOG_ARTIFACT.tools;

/** The frozen catalog indexed by tool name. */
export const CATALOG_BY_NAME = new Map(TOOL_CATALOG.map((t) => [t.name, t]));

/** The frozen catalog's recorded artifact hash — the single pinning source. */
export const CATALOG_ARTIFACT_HASH = CATALOG_ARTIFACT.meta.artifactHash;

/** Creates the evaluation-only Full Tools MCP Server over the frozen catalog.
 * When `armCase` is given, tools declared in it return the case's deterministic
 * result fixture (three-arm runs, issue #7); default behavior is unchanged. */
export function createFullToolsServer(armCase?: ThreeArmCase): Server {
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
    const tool = CATALOG_BY_NAME.get(request.params.name);
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

    const mockPayload = resolveMockResult(
      tool,
      request.params.arguments ?? {},
      armCase,
    );
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(mockPayload) },
      ],
      structuredContent: mockPayload,
    };
  });

  return server;
}
