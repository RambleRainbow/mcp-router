import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMockQuoteUpstream } from "../src/mock-quote-upstream.js";
import { createRouter } from "../src/router.js";

/**
 * Wires the scripted Client -> Router -> Mock Quote Upstream chain over two
 * linked in-memory MCP transports, exactly as a real Agent would traverse it.
 */
export async function createStack() {
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
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await router.server.connect(serverTransport);
  const client = new Client({ name: "scripted-client", version: "0.0.0" });
  await client.connect(clientTransport);

  return { client, router, upstream };
}

export const QUOTE_QUERY = "帮我查一下贵州茅台的最新股价";

export async function discoverQuoteToolRef(client: Client): Promise<string> {
  const discovery = await client.callTool({
    name: "find_tools",
    arguments: { query: QUOTE_QUERY },
  });
  const { candidates } = discovery.structuredContent as {
    candidates: Array<{ toolRef: string }>;
  };
  return candidates[0]!.toolRef;
}
