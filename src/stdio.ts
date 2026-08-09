import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMockQuoteUpstream } from "./mock-quote-upstream.js";
import { createRouter } from "./router.js";

/**
 * stdio entrypoint for the Technical Spike: wires the Router to the
 * in-memory Mock Quote Upstream Server and serves the two Meta-tools to an
 * MCP Host (the Reference Agent) over stdio.
 */
const upstream = createMockQuoteUpstream();
const [upstreamClientTransport, upstreamServerTransport] =
  InMemoryTransport.createLinkedPair();
await upstream.server.connect(upstreamServerTransport);
const upstreamClient = new Client({
  name: "router-upstream-client",
  version: "0.0.0",
});
await upstreamClient.connect(upstreamClientTransport);

const router = createRouter({ upstreamClient });
await router.server.connect(new StdioServerTransport());
