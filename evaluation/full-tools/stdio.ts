import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFullToolsServer } from "./server.js";

/**
 * stdio entrypoint for the evaluation-only Full Tools arm: serves the frozen
 * AiFinMarket Tool Catalog directly to an MCP Host (the Reference Agent)
 * over stdio. Evaluation apparatus only — not the Router product.
 */
await createFullToolsServer().connect(new StdioServerTransport());
