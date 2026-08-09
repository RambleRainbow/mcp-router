import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Scripted MCP Client verifying the frozen AiFinMarket Tool Catalog through
 * the evaluation-only Full Tools stdio server (issue #6). Requires no live
 * financial credentials: every call returns a deterministic mock result.
 *
 * Run with: npm run eval:verify
 */
const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "evaluation/full-tools/stdio.ts"],
  stderr: "inherit",
});
const client = new Client({ name: "catalog-verify-client", version: "0.0.0" });
await client.connect(transport);

try {
  const { tools } = await client.listTools();
  assert.equal(tools.length, 34, "catalog must expose exactly 34 tools");
  const names = tools.map((t) => t.name);
  assert.ok(!names.includes("find_tools"), "must not expose find_tools");
  assert.ok(!names.includes("call_tool"), "must not expose call_tool");
  for (const tool of tools) {
    assert.ok(tool.name, "tool needs a name");
    assert.ok(tool.description, `${tool.name} needs a description`);
    assert.equal(
      tool.inputSchema.type,
      "object",
      `${tool.name} needs an object-root inputSchema`,
    );
  }
  console.log(`tools/list: ${tools.length} tools, schema shape OK`);

  const args = { windcode: "600519.SH", begin: "2026-08-06", end: "2026-08-06" };
  const result = await client.callTool({ name: "get_stock_quote", arguments: args });
  const payload = result.structuredContent as {
    mock?: boolean;
    tool?: string;
    arguments?: Record<string, unknown>;
  };
  assert.ok(!result.isError, "representative call must succeed");
  assert.equal(payload.mock, true, "result must be explicitly mock");
  assert.equal(payload.tool, "get_stock_quote");
  assert.deepEqual(payload.arguments, args);
  console.log("tools/call get_stock_quote: deterministic mock result OK");

  console.log("PASS: frozen AiFinMarket Tool Catalog verified");
} finally {
  await client.close();
}
