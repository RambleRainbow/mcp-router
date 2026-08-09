/**
 * stream-json parsing for the three-arm runner (issue #7): turns one arm's
 * raw Claude Code CLI event stream into a structured ArmTrace.
 */

export interface StreamEvent {
  type: string;
  subtype?: string;
  message?: {
    content?: Array<{
      type: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
      tool_use_id?: string;
      content?: unknown;
      text?: string;
    }>;
  };
  is_error?: boolean;
  duration_ms?: number;
  num_turns?: number;
  result?: string;
  total_cost_usd?: number;
  usage?: Record<string, unknown>;
  modelUsage?: Record<string, unknown>;
  errors?: unknown;
}

export interface ArmTrace {
  arm: string;
  prompt: string;
  toolCalls: Array<{ tool: string; arguments: Record<string, unknown> }>;
  discoveredCandidates: string[] | null;
  /** toolRef → tool name recovered from the full find_tools result. */
  toolRefToName: Record<string, string> | null;
  discoveryMeta: Record<string, unknown> | null;
  /** Cost of the Simple Router discovery CLI call, when separate. */
  discoveryCostUsd: number | null;
  toolResults: Array<{ tool: string; textExcerpt: string }>;
  finalAnswer: string | null;
  usage: Record<string, unknown> | null;
  costUsd: number | null;
  latencyMs: number | null;
  numTurns: number | null;
  errors: string[];
  rubric?: Array<{ id: string; verdict: string; evidence: string }>;
}

/** Strips the `mcp__<server>__` prefix from an MCP tool_use name. */
function bareToolName(mcpName: string): string {
  const idx = mcpName.lastIndexOf("__");
  return idx >= 0 ? mcpName.slice(idx + 2) : mcpName;
}

function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        typeof c === "object" && c !== null && "text" in c
          ? String((c as { text: unknown }).text)
          : "",
      )
      .join("\n");
  }
  return "";
}

/** Parses raw stream-json lines into events; unparseable lines are kept. */
export function parseStreamEvents(stdout: string): StreamEvent[] {
  return stdout
    .split("\n")
    .filter((line) => line.trim().startsWith("{"))
    .map((line) => {
      try {
        return JSON.parse(line) as StreamEvent;
      } catch {
        return { type: "unparseable" };
      }
    });
}

/** Builds the structured trace for one arm from its parsed events. */
export function parseArmTrace(
  armId: string,
  events: StreamEvent[],
  spawnError: string | null,
  wallMs: number,
  prompt: string,
): ArmTrace {
  const toolUsesById = new Map<
    string,
    { tool: string; arguments: Record<string, unknown> }
  >();
  const toolResults: Array<{ tool: string; textExcerpt: string }> = [];
  let discoveredCandidates: string[] | null = null;
  let toolRefToName: Record<string, string> | null = null;
  let discoveryMeta: Record<string, unknown> | null = null;
  let finalAnswer: string | null = null;
  let usage: Record<string, unknown> | null = null;
  let costUsd: number | null = null;
  let latencyMs: number | null = null;
  let numTurns: number | null = null;
  const errors: string[] = spawnError ? [spawnError] : [];

  for (const event of events) {
    if (event.type === "assistant") {
      for (const block of event.message?.content ?? []) {
        if (block.type === "tool_use" && block.id && block.name) {
          toolUsesById.set(block.id, {
            tool: bareToolName(block.name),
            arguments: block.input ?? {},
          });
        }
      }
    } else if (event.type === "user") {
      for (const block of event.message?.content ?? []) {
        if (block.type === "tool_result" && block.tool_use_id) {
          const use = toolUsesById.get(block.tool_use_id);
          const text = toolResultText(block.content);
          toolResults.push({
            tool: use?.tool ?? "unknown",
            textExcerpt: text.slice(0, 500),
          });
          if (use?.tool === "find_tools") {
            try {
              const payload = JSON.parse(text) as {
                candidates?: Array<{ toolRef: string; name: string }>;
                discovery?: Record<string, unknown>;
              };
              discoveredCandidates = (payload.candidates ?? []).map(
                (c) => c.name,
              );
              toolRefToName = Object.fromEntries(
                (payload.candidates ?? []).map((c) => [c.toolRef, c.name]),
              );
              discoveryMeta = payload.discovery ?? null;
            } catch {
              errors.push("find_tools result was not parseable JSON");
            }
          }
        }
      }
    } else if (event.type === "result") {
      finalAnswer = event.result ?? null;
      usage = event.usage ?? null;
      costUsd = event.total_cost_usd ?? null;
      latencyMs = event.duration_ms ?? null;
      numTurns = event.num_turns ?? null;
      if (event.is_error) errors.push("claude session reported is_error");
    }
  }

  return {
    arm: armId,
    prompt,
    toolCalls: [...toolUsesById.values()],
    discoveredCandidates,
    toolRefToName,
    discoveryMeta,
    discoveryCostUsd:
      typeof discoveryMeta?.["costUsd"] === "number"
        ? (discoveryMeta["costUsd"] as number)
        : null,
    toolResults,
    finalAnswer,
    usage,
    costUsd,
    latencyMs: latencyMs ?? wallMs,
    numTurns,
    errors,
  };
}

/** Session cost plus any separate discovery-call cost. */
export function totalArmCost(trace: ArmTrace): number {
  return (trace.costUsd ?? 0) + (trace.discoveryCostUsd ?? 0);
}
