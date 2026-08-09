import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface MockQuoteUpstream {
  server: McpServer;
  invocationCount: () => number;
}

/**
 * In-memory Mock Quote Upstream Server. Owns one atomic quote tool and
 * returns deterministic structured data flagged with `mock: true`.
 */
export function createMockQuoteUpstream(): MockQuoteUpstream {
  let invocations = 0;

  const server = new McpServer({
    name: "mock-quote-upstream",
    version: "0.0.0",
  });

  server.registerTool(
    "get_latest_quote",
    {
      description: "查询 A 股证券最新行情快照（mock 数据）",
      inputSchema: {
        securityName: z.string().describe("证券名称，例如：贵州茅台"),
      },
      outputSchema: {
        securityName: z.string(),
        securityCode: z.string(),
        latestPrice: z.number(),
        currency: z.string(),
        asOf: z.string(),
        mock: z.literal(true),
      },
    },
    async ({ securityName }) => {
      invocations += 1;
      const quote = {
        securityName,
        securityCode: "600519.SH",
        latestPrice: 1488.2,
        currency: "CNY",
        asOf: "2026-08-09T15:00:00+08:00",
        mock: true as const,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: `${quote.securityName}（${quote.securityCode}）最新价 ${quote.latestPrice} ${quote.currency}，截至 ${quote.asOf}（mock 数据）`,
          },
        ],
        structuredContent: quote,
      };
    },
  );

  return { server, invocationCount: () => invocations };
}
