import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ThreeArmCase } from "./case.js";
import { createRouterArmServer } from "./meta-tools.js";
import { CATALOG_BY_NAME } from "../full-tools/server.js";

/**
 * Oracle Router arm (issue #7): discovery is an oracle — it always returns
 * the case's predeclared acceptable Candidate Tool(s) from the frozen Tool
 * Catalog through the fixed find_tools/call_tool interface.
 */

/** Creates the Oracle Router MCP Server for one declared three-arm case. */
export function createOracleRouterServer(armCase: ThreeArmCase): McpServer {
  return createRouterArmServer({
    serverName: "oracle-router-eval",
    armCase,
    matchReason: `oracle: 案例 ${armCase.caseId} 预先声明的可接受 Candidate Tool`,
    selectCandidates: async () => ({
      tools: armCase.acceptableTools.map((name) => {
        const tool = CATALOG_BY_NAME.get(name);
        if (!tool) {
          throw new Error(
            `case ${armCase.caseId}: acceptable tool ${name} not in frozen catalog`,
          );
        }
        return tool;
      }),
    }),
  });
}
