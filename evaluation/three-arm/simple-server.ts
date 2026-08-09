import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ThreeArmCase } from "./case.js";
import type { DiscoverFn } from "./discovery.js";
import { createRouterArmServer } from "./meta-tools.js";
import { CATALOG_BY_NAME } from "../full-tools/server.js";

/**
 * Simple Router arm (issue #7): discovery is a single frozen one-shot
 * prompt over only the query and the frozen Tool Catalog, returning at
 * most three Candidate Tools. No per-case rules, retries, memory, or
 * post-result tuning — hallucinated names are dropped honestly, and a
 * failed discovery call is recorded instead of retried.
 */

const MAX_CANDIDATES = 3;

/** Creates the Simple Router MCP Server with an injected discovery function. */
export function createSimpleRouterServer(
  armCase: ThreeArmCase,
  discover: DiscoverFn,
): McpServer {
  return createRouterArmServer({
    serverName: "simple-router-eval",
    armCase,
    matchReason: "simple-router: 冻结 one-shot 发现 prompt 选出的 Candidate Tool",
    selectCandidates: async (query) => {
      let outcome;
      try {
        outcome = await discover(query);
      } catch (error) {
        return {
          tools: [],
          meta: {
            discoveryError:
              error instanceof Error ? error.message : String(error),
          },
        };
      }

      const seen = new Set<string>();
      const tools = [];
      for (const name of outcome.names) {
        const tool = CATALOG_BY_NAME.get(name);
        if (tool && !seen.has(name) && tools.length < MAX_CANDIDATES) {
          seen.add(name);
          tools.push(tool);
        }
      }
      return {
        tools,
        meta: {
          discovery: outcome.meta ?? null,
          discoveredNames: outcome.names,
        },
      };
    },
  });
}
