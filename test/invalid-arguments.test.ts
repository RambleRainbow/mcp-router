import { describe, expect, it } from "vitest";
import { createStack, discoverQuoteToolRef } from "./stack.js";

describe("call_tool argument validation", () => {
  it("rejects missing securityName before any upstream invocation", async () => {
    const { client, upstream } = await createStack();
    const toolRef = await discoverQuoteToolRef(client);

    // A tool execution error resolves with `isError`; a malformed MCP
    // protocol request would reject the promise instead.
    const result = await client.callTool({
      name: "call_tool",
      arguments: { toolRef, arguments: {} },
    });

    expect(result.isError).toBe(true);

    const { error } = result.structuredContent as {
      error: {
        code: string;
        message: string;
        violations: Array<{ path: string; keyword: string }>;
        recovery: string;
      };
    };
    expect(error.code).toBe("INVALID_ARGUMENTS");
    expect(error.violations).toContainEqual({
      path: "/securityName",
      keyword: "required",
    });
    expect(error.recovery).toBe("clarify_and_retry");

    const content = result.content as Array<{ type: string; text?: string }>;
    expect(content[0]).toMatchObject({ type: "text" });
    expect(content[0]!.text).toContain("INVALID_ARGUMENTS");

    expect(upstream.invocationCount()).toBe(0);
  });
});
