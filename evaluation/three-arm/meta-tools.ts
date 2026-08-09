import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ThreeArmCase } from "./case.js";
import {
  CATALOG_ARTIFACT_HASH,
  type CatalogTool,
} from "../full-tools/server.js";
import { resolveMockResult } from "../full-tools/fixtures.js";

/**
 * Shared fixed Meta-tool interface for the evaluation Router arms
 * (issue #7): exactly `find_tools` and `call_tool`, mirroring the frozen
 * Router's tool names, input shapes, and descriptions (src/router.ts).
 * Arms differ only in how find_tools selects Candidate Tools.
 * Evaluation apparatus only; not the frozen Router product.
 */

const FIND_TOOLS_DESCRIPTION =
  "发现可用的金融数据工具。查询股票行情、财务等金融数据时，先调用本工具：传入自包含的自然语言 query，返回匹配的 Candidate Tool（含 inputSchema 和不透明的 Tool Reference）";
const CALL_TOOL_DESCRIPTION =
  "调用 find_tools 返回的上游金融数据工具：传入其 Tool Reference，并按该工具的 inputSchema 填写 arguments，返回数据结果";

export interface CandidateSelection {
  tools: CatalogTool[];
  /** Optional selection metadata merged into the find_tools payload. */
  meta?: Record<string, unknown>;
}

export interface RouterArmOptions {
  serverName: string;
  armCase: ThreeArmCase;
  matchReason: string;
  selectCandidates: (query: string) => Promise<CandidateSelection>;
}

function errorResult(code: string, message: string, recovery: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `${code}: ${message}` }],
    structuredContent: { error: { code, message, recovery } },
  };
}

/** Creates an evaluation Router-arm MCP Server over the frozen catalog. */
export function createRouterArmServer(options: RouterArmOptions): McpServer {
  const toolReferences = new Map<string, CatalogTool>();

  const server = new McpServer({
    name: options.serverName,
    version: "0.0.0",
  });

  server.registerTool(
    "find_tools",
    {
      description: FIND_TOOLS_DESCRIPTION,
      inputSchema: {
        query: z.string().describe("自包含的工具需求描述"),
        limit: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ query }) => {
      const selection = await options.selectCandidates(query);
      const candidates = selection.tools.map((tool) => {
        const toolRef = `tr_${randomUUID()}`;
        toolReferences.set(toolRef, tool);
        return {
          toolRef,
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          matchReason: options.matchReason,
        };
      });

      const payload = {
        status: candidates.length > 0 ? ("ready" as const) : ("no_match" as const),
        catalogRevision: CATALOG_ARTIFACT_HASH,
        ...selection.meta,
        candidates,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(payload) }],
        structuredContent: payload,
      };
    },
  );

  server.registerTool(
    "call_tool",
    {
      description: CALL_TOOL_DESCRIPTION,
      inputSchema: {
        toolRef: z.string().describe("find_tools 返回的不透明 Tool Reference"),
        arguments: z.record(z.unknown()).describe("传给上游工具的参数"),
      },
    },
    async ({ toolRef, arguments: toolArguments }) => {
      const tool = toolReferences.get(toolRef);
      if (!tool) {
        return errorResult(
          "INVALID_TOOL_REF",
          "未知或已过期的 Tool Reference",
          "re_discover",
        );
      }
      const mockPayload = resolveMockResult(tool, toolArguments, options.armCase);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(mockPayload) },
        ],
        structuredContent: mockPayload,
      };
    },
  );

  return server;
}
