import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadArmCaseFromEnv } from "./case.js";
import { createOracleRouterServer } from "./oracle-server.js";

/**
 * stdio entrypoint for arm B (Oracle Router) of a three-arm run. The case
 * is pinned per process through THREE_ARM_CASE_PATH.
 */
const armCase = loadArmCaseFromEnv();
await createOracleRouterServer(armCase).connect(new StdioServerTransport());
