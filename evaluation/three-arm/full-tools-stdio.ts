import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DEFAULT_CASE_PATH, loadThreeArmCase } from "./case.js";
import { createFullToolsServer } from "../full-tools/server.js";

/**
 * stdio entrypoint for arm A (Full Tools) of a three-arm run: the frozen
 * Tool Catalog exposed directly, with the case's deterministic fixture.
 */
const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);
await createFullToolsServer(armCase).connect(new StdioServerTransport());
