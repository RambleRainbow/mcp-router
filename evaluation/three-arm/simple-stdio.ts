import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DEFAULT_CASE_PATH, loadThreeArmCase } from "./case.js";
import { discoverWithCli } from "./discovery.js";
import { createSimpleRouterServer } from "./simple-server.js";

/**
 * stdio entrypoint for arm C (Simple Router) of a three-arm run: discovery
 * is the frozen one-shot prompt executed through one Claude Code CLI call.
 */
const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);
await createSimpleRouterServer(armCase, discoverWithCli).connect(
  new StdioServerTransport(),
);
