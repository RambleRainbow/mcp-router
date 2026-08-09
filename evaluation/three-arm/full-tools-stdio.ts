import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadArmCaseFromEnv } from "./case.js";
import { createFullToolsServer } from "../full-tools/server.js";

/**
 * stdio entrypoint for arm A (Full Tools) of a three-arm run: the frozen
 * Tool Catalog exposed directly, with the case's deterministic fixture.
 * The case is pinned per process through THREE_ARM_CASE_PATH.
 */
const armCase = loadArmCaseFromEnv();
await createFullToolsServer(armCase).connect(new StdioServerTransport());
