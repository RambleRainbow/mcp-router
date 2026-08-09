import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  DEFAULT_CASE_PATH,
  loadThreeArmCase,
  REFERENCE_AGENT_MODEL,
  type ThreeArmCase,
} from "./case.js";
import { PROMPT_REVISION } from "./discovery.js";
import { evaluateRubric } from "./rubric.js";
import {
  parseArmTrace,
  parseStreamEvents,
  totalArmCost,
  type ArmTrace,
} from "./trace.js";
import { CATALOG_ARTIFACT_HASH, TOOL_CATALOG } from "../full-tools/server.js";

/**
 * Three-arm runner (issue #7): runs one declared synthetic, non-scored
 * financial case once through A — Full Tools, B — Oracle Router, and
 * C — Simple Router, each in a fresh Claude Code CLI process with
 * `claude-opus-5[1m]` over stdio. Produces machine-readable raw traces
 * plus a human-readable summary under evaluation/three-arm/runs/<runId>/.
 * The run is explicitly NON-SCORED: it proves the comparison can be
 * executed and measured, and makes no claim that one arm is better.
 *
 * Run with: npm run eval:three-arm
 */

const execFileAsync = promisify(execFile);

const ARMS = [
  {
    id: "A-full-tools",
    entry: "evaluation/three-arm/full-tools-stdio.ts",
    serverName: "full-tools",
  },
  {
    id: "B-oracle-router",
    entry: "evaluation/three-arm/oracle-stdio.ts",
    serverName: "oracle",
  },
  {
    id: "C-simple-router",
    entry: "evaluation/three-arm/simple-stdio.ts",
    serverName: "simple",
  },
] as const;

async function run() {
  const armCase = loadThreeArmCase(DEFAULT_CASE_PATH);

  const { stdout: cliVersionRaw } = await execFileAsync("claude", ["--version"]);
  const { stdout: codeRevisionRaw } = await execFileAsync("git", [
    "rev-parse",
    "HEAD",
  ]);
  const { stdout: dirtyRaw } = await execFileAsync("git", [
    "status",
    "--porcelain",
    "--",
    ".",
    ":(exclude)evaluation/three-arm/runs",
  ]);

  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${armCase.caseId}`;
  const runDir = join("evaluation/three-arm/runs", runId);
  mkdirSync(runDir, { recursive: true });

  const pinnedConfig = {
    model: REFERENCE_AGENT_MODEL,
    cliVersion: cliVersionRaw.trim(),
    codeRevision: codeRevisionRaw.trim(),
    worktreeDirty: dirtyRaw.trim().length > 0,
    catalogHash: CATALOG_ARTIFACT_HASH,
    caseFileSha256: createHash("sha256")
      .update(readFileSync(DEFAULT_CASE_PATH))
      .digest("hex"),
    simpleRouterDiscoveryPromptRevision: PROMPT_REVISION,
    simpleRouterDiscoveryModel: REFERENCE_AGENT_MODEL,
    transport: "stdio",
    casePath: DEFAULT_CASE_PATH,
  };

  const armResults: ArmTrace[] = [];
  for (const arm of ARMS) {
    console.log(`\n=== ${arm.id} ===`);
    const mcpConfigPath = join(runDir, `${arm.id}.mcp.json`);
    const allowedTools =
      arm.id === "A-full-tools"
        ? TOOL_CATALOG.map((t) => `mcp__${arm.serverName}__${t.name}`)
        : [
            `mcp__${arm.serverName}__find_tools`,
            `mcp__${arm.serverName}__call_tool`,
          ];
    writeFileSync(
      mcpConfigPath,
      JSON.stringify(
        {
          mcpServers: {
            [arm.serverName]: {
              command: "npx",
              args: ["tsx", arm.entry],
            },
          },
        },
        null,
        2,
      ),
    );

    const startedAt = Date.now();
    let stdout = "";
    let spawnError: string | null = null;
    try {
      const result = await execFileAsync(
        "claude",
        [
          "-p",
          armCase.userPrompt,
          "--model",
          REFERENCE_AGENT_MODEL,
          "--mcp-config",
          mcpConfigPath,
          "--strict-mcp-config",
          "--allowedTools",
          ...allowedTools,
          "--output-format",
          "stream-json",
          "--verbose",
        ],
        { maxBuffer: 64 * 1024 * 1024, timeout: 900_000 },
      );
      stdout = result.stdout;
    } catch (error) {
      spawnError = error instanceof Error ? error.message : String(error);
      stdout = (error as { stdout?: string }).stdout ?? "";
    }

    writeFileSync(join(runDir, `${arm.id}.raw.jsonl`), stdout);
    const trace = parseArmTrace(
      arm.id,
      parseStreamEvents(stdout),
      spawnError,
      Date.now() - startedAt,
      armCase.userPrompt,
    );
    trace.rubric = evaluateRubric(armCase, arm.id, trace);
    writeFileSync(
      join(runDir, `${arm.id}.trace.json`),
      JSON.stringify(trace, null, 2),
    );
    armResults.push(trace);
    console.log(
      `  tool calls: ${trace.toolCalls.map((c) => c.tool).join(", ") || "(none)"} | cost: $${totalArmCost(trace).toFixed(4)} | rubric: ${trace.rubric.map((r) => `${r.id}=${r.verdict}`).join(" ")}`,
    );
  }

  const runSummary = {
    runId,
    label: armCase.label,
    scored: false,
    case: armCase,
    pinnedConfig,
    arms: armResults,
    totals: {
      costUsd: armResults.reduce((sum, a) => sum + totalArmCost(a), 0),
      sessions: armResults.length,
    },
  };
  writeFileSync(join(runDir, "run.json"), JSON.stringify(runSummary, null, 2));
  writeFileSync(join(runDir, "summary.md"), renderSummary(runSummary));
  console.log(`\nrun dir: ${runDir}`);
  console.log(
    `total cost: $${runSummary.totals.costUsd.toFixed(4)} across ${runSummary.totals.sessions} sessions (discovery calls included)`,
  );
}

function renderSummary(run: {
  runId: string;
  label: string;
  case: ThreeArmCase;
  pinnedConfig: Record<string, unknown>;
  arms: ArmTrace[];
  totals: { costUsd: number; sessions: number };
}): string {
  const lines = [
    `# Three-Arm Run ${run.runId}`,
    "",
    `**NON-SCORED** — ${run.label}`,
    "",
    "## Pinned configuration",
    "",
    "```json",
    JSON.stringify(run.pinnedConfig, null, 2),
    "```",
    "",
    `## Case: ${run.case.caseId} (${run.case.kind})`,
    "",
    `- User prompt: ${run.case.userPrompt}`,
    `- Acceptable tools: ${run.case.acceptableTools.join(", ")}`,
    "",
    "## Arms",
    "",
    "| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const arm of run.arms) {
    const cost =
      arm.discoveryCostUsd !== null
        ? `${(arm.costUsd ?? 0).toFixed(4)} session + ${arm.discoveryCostUsd.toFixed(4)} discovery = ${totalArmCost(arm).toFixed(4)}`
        : (arm.costUsd?.toFixed(4) ?? "?");
    lines.push(
      `| ${arm.arm} | ${arm.discoveredCandidates?.join(", ") ?? "(full catalog)"} | ${arm.toolCalls.map((c) => c.tool).join(", ") || "none"} | ${arm.numTurns ?? "?"} | ${cost} | ${((arm.latencyMs ?? 0) / 1000).toFixed(1)} | ${(arm.rubric ?? []).map((r) => `${r.id}: ${r.verdict}`).join("<br>")} |`,
    );
  }
  lines.push(
    "",
    `Total: $${run.totals.costUsd.toFixed(4)} across ${run.totals.sessions} fresh CLI sessions (Simple Router discovery call included).`,
    "",
    "This run proves only that the three-arm comparison can be executed and",
    "measured. It does not rank arms and makes no product-value claim.",
  );
  return lines.join("\n") + "\n";
}

await run();
