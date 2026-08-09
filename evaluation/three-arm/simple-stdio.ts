import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadArmCaseFromEnv } from "./case.js";
import { discoverWithCli } from "./discovery.js";
import { createSimpleRouterServer } from "./simple-server.js";

/**
 * stdio entrypoint for arm C (Simple Router) of a three-arm run: discovery
 * is the frozen one-shot prompt executed through one Claude Code CLI call.
 * The case is pinned per process through THREE_ARM_CASE_PATH.
 */
const armCase = loadArmCaseFromEnv();
await createSimpleRouterServer(armCase, discoverWithCli).connect(
  new StdioServerTransport(),
);
