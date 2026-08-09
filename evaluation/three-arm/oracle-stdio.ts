import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DEFAULT_CASE_PATH, loadThreeArmCase } from "./case.js";
import { createOracleRouterServer } from "./oracle-server.js";

/**
 * stdio entrypoint for arm B (Oracle Router) of a three-arm run.
 */
const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);
await createOracleRouterServer(armCase).connect(new StdioServerTransport());
