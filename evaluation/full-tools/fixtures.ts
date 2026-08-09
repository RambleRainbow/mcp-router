import type { CatalogTool } from "./server.js";
import type { ThreeArmCase } from "../three-arm/case.js";

/**
 * Shared deterministic mock resolver used by every evaluation arm, so that
 * equivalent valid calls receive the same deterministic result fixture
 * across Full Tools, Oracle Router, and Simple Router (issue #7).
 */
export type MockResultEnvelope = {
  mock: true;
  note: string;
  tool: string;
  serverCategory: string;
  arguments: Record<string, unknown>;
  data: unknown;
};

const MOCK_NOTE =
  "Evaluation-only deterministic mock; no live Wind data was queried.";

/**
 * Builds the mock result envelope for a catalog tool. When a three-arm case
 * declares a per-tool result fixture for this tool, `data` is that fixture;
 * otherwise `data` is empty. Output depends only on the inputs — no clocks,
 * no random.
 */
export function resolveMockResult(
  tool: CatalogTool,
  args: Record<string, unknown>,
  armCase?: ThreeArmCase,
): MockResultEnvelope {
  const expectation = armCase?.toolExpectations[tool.name];
  return {
    mock: true,
    note: MOCK_NOTE,
    tool: tool.name,
    serverCategory: tool.serverCategory,
    arguments: args,
    data: expectation ? expectation.resultFixture : [],
  };
}
