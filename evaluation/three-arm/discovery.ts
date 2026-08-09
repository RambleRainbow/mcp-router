import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { REFERENCE_AGENT_MODEL } from "./case.js";
import {
  TOOL_CATALOG,
  type CatalogTool,
} from "../full-tools/server.js";

/**
 * Frozen one-shot discovery for the Simple Router arm (issue #7): a single
 * fixed prompt over only the query and the frozen Tool Catalog. No per-case
 * rules, no retries, no memory, no post-result tuning. The prompt template
 * lives in discovery-prompt.md; PROMPT_REVISION pins its content hash.
 */

const PROMPT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "discovery-prompt.md",
);
const PROMPT_TEMPLATE = readFileSync(PROMPT_PATH, "utf8");

/** sha256 (truncated) of the frozen discovery prompt template. */
export const PROMPT_REVISION = createHash("sha256")
  .update(PROMPT_TEMPLATE)
  .digest("hex")
  .slice(0, 12);

/** Builds the one-shot discovery prompt from the frozen template. */
export function buildDiscoveryPrompt(
  query: string,
  catalog: CatalogTool[],
): string {
  const catalogLines = catalog
    .map((t) => `- ${t.name}（${t.serverCategory}）：${t.description}`)
    .join("\n");
  return PROMPT_TEMPLATE.replace("{{CATALOG}}", catalogLines).replace(
    "{{QUERY}}",
    query,
  );
}

export interface DiscoveryOutcome {
  /** Tool names as returned by discovery, unfiltered. */
  names: string[];
  /** Pinned discovery-call metadata (model, usage, cost) when available. */
  meta?: Record<string, unknown>;
}

export type DiscoverFn = (query: string) => Promise<DiscoveryOutcome>;

const execFileAsync = promisify(execFile);

/**
 * Production DiscoverFn: exactly one Claude Code CLI call with the frozen
 * prompt. Parse failure or CLI failure propagates to the caller, which
 * records it honestly — there is no retry here by design.
 */
export const discoverWithCli: DiscoverFn = async (query) => {
  const prompt = buildDiscoveryPrompt(query, TOOL_CATALOG);
  const { stdout } = await execFileAsync(
    "claude",
    [
      "-p",
      prompt,
      "--model",
      REFERENCE_AGENT_MODEL,
      "--output-format",
      "json",
    ],
    { maxBuffer: 8 * 1024 * 1024, timeout: 180_000 },
  );
  const envelope = JSON.parse(stdout) as {
    result?: string;
    is_error?: boolean;
    total_cost_usd?: number;
    usage?: Record<string, unknown>;
    modelUsage?: Record<string, unknown>;
  };
  const arrayMatch = (envelope.result ?? "").match(/\[[\s\S]*\]/);
  const parsed: unknown = arrayMatch ? JSON.parse(arrayMatch[0]) : [];
  return {
    names: Array.isArray(parsed)
      ? parsed.filter((n): n is string => typeof n === "string")
      : [],
    meta: {
      model: REFERENCE_AGENT_MODEL,
      promptRevision: PROMPT_REVISION,
      isError: envelope.is_error ?? false,
      costUsd: envelope.total_cost_usd ?? null,
      usage: envelope.usage ?? null,
    },
  };
};
