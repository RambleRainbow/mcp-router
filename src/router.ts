import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export interface RouterOptions {
  upstreamClient: Client;
}

export type RouterEvent =
  | { type: "query_received"; query: string }
  | { type: "rule_matched"; ruleId: string; toolName: string }
  | { type: "tool_ref_issued"; toolRef: string; toolName: string }
  | { type: "call_tool_invoked"; toolRef: string; arguments: Record<string, unknown> }
  | { type: "upstream_called"; toolName: string };

export interface Router {
  server: McpServer;
  events: RouterEvent[];
}

interface CatalogEntry {
  capability: string;
  toolName: string;
  description: string;
  /** Authoritative JSON Schema advertised to Agents in the Candidate Tool. */
  inputSchema: Record<string, unknown>;
  /** Validator applied to `call_tool` arguments before any upstream call. */
  argumentsSchema: z.ZodType<Record<string, unknown>>;
  matchRule: { id: string; keyword: string; reason: string };
}

const TOOL_CATALOG: CatalogEntry[] = [
  {
    capability: "equity.quote.snapshot",
    toolName: "get_latest_quote",
    description: "查询 A 股证券最新行情快照（mock 数据）",
    inputSchema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        securityName: {
          type: "string",
          description: "证券名称，例如：贵州茅台",
        },
      },
      required: ["securityName"],
      additionalProperties: false,
    },
    argumentsSchema: z.object({ securityName: z.string() }).strict(),
    matchRule: {
      id: "quote.snapshot:keyword:股价",
      keyword: "股价",
      reason: "query 询问最新股价，匹配行情快照能力 equity.quote.snapshot",
    },
  },
];

function errorResult(
  code: string,
  message: string,
  recovery: string,
  extra?: Record<string, unknown>,
) {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: `${code}: ${message}`,
      },
    ],
    structuredContent: {
      error: { code, message, recovery, ...extra },
    },
  };
}

/**
 * The Router MCP service. Exposes exactly the two fixed Meta-tools
 * `find_tools` and `call_tool` and forwards selected calls to the owning
 * Upstream Server through the official MCP Client.
 */
export function createRouter(options: RouterOptions): Router {
  const events: RouterEvent[] = [];
  const toolReferences = new Map<string, CatalogEntry>();

  const server = new McpServer({ name: "mcp-router", version: "0.0.0" });

  server.registerTool(
    "find_tools",
    {
      description: "按自然语言 query 发现可用的上游工具，返回候选工具与 Tool Reference",
      inputSchema: {
        query: z.string().describe("自包含的工具需求描述"),
        limit: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ query }) => {
      events.push({ type: "query_received", query });

      const candidates = TOOL_CATALOG.filter((entry) =>
        query.includes(entry.matchRule.keyword),
      ).map((entry) => {
        events.push({
          type: "rule_matched",
          ruleId: entry.matchRule.id,
          toolName: entry.toolName,
        });
        const toolRef = `tr_${randomUUID()}`;
        toolReferences.set(toolRef, entry);
        events.push({
          type: "tool_ref_issued",
          toolRef,
          toolName: entry.toolName,
        });
        return {
          toolRef,
          name: entry.toolName,
          description: entry.description,
          inputSchema: entry.inputSchema,
          matchReason: entry.matchRule.reason,
        };
      });

      const payload = {
        status: candidates.length > 0 ? "ready" : "no_match",
        catalogRevision: "cat_spike_1",
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
      description: "使用 find_tools 返回的 Tool Reference 调用对应的上游工具",
      inputSchema: {
        toolRef: z.string().describe("find_tools 返回的不透明 Tool Reference"),
        arguments: z.record(z.unknown()).describe("传给上游工具的参数"),
      },
    },
    async ({ toolRef, arguments: toolArguments }) => {
      const resolvedTool = toolReferences.get(toolRef);
      if (!resolvedTool) {
        return errorResult(
          "INVALID_TOOL_REF",
          "未知或已过期的 Tool Reference",
          "re_discover",
        );
      }

      events.push({
        type: "call_tool_invoked",
        toolRef,
        arguments: toolArguments,
      });

      const parsed = resolvedTool.argumentsSchema.safeParse(toolArguments);
      if (!parsed.success) {
        return errorResult(
          "INVALID_ARGUMENTS",
          "参数不符合上游工具的 inputSchema",
          "clarify_and_retry",
          {
            violations: parsed.error.issues.map((issue) => ({
              path: `/${issue.path.join("/")}`,
              keyword: issue.code,
            })),
          },
        );
      }

      const upstreamResult = (await options.upstreamClient.callTool({
        name: resolvedTool.toolName,
        arguments: parsed.data,
      })) as CallToolResult;

      events.push({ type: "upstream_called", toolName: resolvedTool.toolName });

      return {
        content: upstreamResult.content,
        structuredContent: upstreamResult.structuredContent,
        isError: Boolean(upstreamResult.isError),
      };
    },
  );

  return { server, events };
}
