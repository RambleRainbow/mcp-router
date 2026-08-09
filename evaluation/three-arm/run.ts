import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  CASE_PATH_ENV,
  loadProcessSet,
  PROCESS_SET_PATH,
  REFERENCE_AGENT_MODEL,
  type ThreeArmCase,
} from "./case.js";
import { PROMPT_REVISION } from "./discovery.js";
import { evaluateRubric } from "./rubric.js";
import { armOrderForCase, budgetExceeded } from "./schedule.js";
import {
  renderSummary,
  type CaseResult,
  type RunSummary,
  type SkippedArm,
} from "./summary.js";
import {
  parseArmTrace,
  parseStreamEvents,
  totalArmCost,
  type ArmTrace,
} from "./trace.js";
import { CATALOG_ARTIFACT_HASH, TOOL_CATALOG } from "../full-tools/server.js";

/**
 * Three-arm case-set runner (issues #7/#8): runs a declared case set — by
 * default the frozen process-MVP set, or any set file passed as the first
 * argument — once through A — Full Tools, B — Oracle Router, and
 * C — Simple Router, each case in a fresh Claude Code CLI process with
 * `claude-opus-5[1m]` over stdio. Arm order is counterbalanced across
 * cases; execution stops before exceeding either hard limit declared in
 * the set, and a partial run is recorded honestly. Produces
 * machine-readable raw traces plus a human-readable summary under
 * evaluation/three-arm/runs/<runId>/. Whether the set is scored is its own
 * declaration; the runner itself never ranks arms.
 *
 * Run with: npm run eval:three-arm [-- <setPath>]
 */

const execFileAsync = promisify(execFile);

async function runArm(
  arm: { id: string; entry: string; serverName: string },
  armCase: ThreeArmCase,
  casePath: string,
  caseDir: string,
): Promise<ArmTrace> {
  const mcpConfigPath = join(caseDir, `${arm.id}.mcp.json`);
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
            env: { [CASE_PATH_ENV]: casePath },
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

  writeFileSync(join(caseDir, `${arm.id}.raw.jsonl`), stdout);
  const trace = parseArmTrace(
    arm.id,
    parseStreamEvents(stdout),
    spawnError,
    Date.now() - startedAt,
    armCase.userPrompt,
  );
  trace.rubric = evaluateRubric(armCase, arm.id, trace);
  writeFileSync(
    join(caseDir, `${arm.id}.trace.json`),
    JSON.stringify(trace, null, 2),
  );
  console.log(
    `  tool calls: ${trace.toolCalls.map((c) => c.tool).join(", ") || "(none)"} | cost: $${totalArmCost(trace).toFixed(4)} | rubric: ${trace.rubric.map((r) => `${r.id}=${r.verdict}`).join(" ")}`,
  );
  return trace;
}

async function run() {
  // Optional argument: path to a declared case set (default: the frozen
  // process-MVP set).
  const setPath = process.argv[2] ?? PROCESS_SET_PATH;
  const processSet = loadProcessSet(setPath);
  const limits = processSet.hardLimits;

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

  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${processSet.setId}`;
  const runDir = join("evaluation/three-arm/runs", runId);
  mkdirSync(runDir, { recursive: true });

  const pinnedConfig = {
    model: REFERENCE_AGENT_MODEL,
    cliVersion: cliVersionRaw.trim(),
    codeRevision: codeRevisionRaw.trim(),
    worktreeDirty: dirtyRaw.trim().length > 0,
    catalogHash: CATALOG_ARTIFACT_HASH,
    processSetPath: setPath,
    processSetSha256: createHash("sha256")
      .update(readFileSync(setPath))
      .digest("hex"),
    simpleRouterDiscoveryPromptRevision: PROMPT_REVISION,
    simpleRouterDiscoveryModel: REFERENCE_AGENT_MODEL,
    transport: "stdio",
  };

  const caseResults: CaseResult[] = [];
  const skipped: SkippedArm[] = [];
  let stopReason: string | null = null;
  let sessionsUsed = 0;
  let discoveryCalls = 0;
  let costSoFarUsd = 0;

  outer: for (const [caseIndex, armCase] of processSet.cases.entries()) {
    const casePath = processSet.casePaths[caseIndex]!;
    const caseDir = join(runDir, armCase.caseId);
    mkdirSync(caseDir, { recursive: true });

    const caseResult: CaseResult = {
      case: armCase,
      caseFileSha256: createHash("sha256")
        .update(readFileSync(casePath))
        .digest("hex"),
      armOrder: armOrderForCase(caseIndex).map((a) => a.id),
      arms: [],
    };
    caseResults.push(caseResult);

    for (const arm of armOrderForCase(caseIndex)) {
      if (budgetExceeded(sessionsUsed, costSoFarUsd, limits)) {
        stopReason =
          sessionsUsed >= limits.maxSessions
            ? `session 硬上限 ${limits.maxSessions} 已达`
            : `费用硬上限 $${limits.maxCostUsd} 已达`;
        console.log(`\n=== ${armCase.caseId} / ${arm.id} === SKIPPED: ${stopReason}`);
        break outer;
      }
      console.log(`\n=== ${armCase.caseId} / ${arm.id} ===`);
      const trace = await runArm(arm, armCase, casePath, caseDir);
      caseResult.arms.push(trace);
      sessionsUsed++;
      if (trace.discoveryMeta !== null) discoveryCalls++;
      costSoFarUsd += totalArmCost(trace);
    }
  }

  // Record every arm that never ran, so the partial run is explicit.
  if (stopReason) {
    for (const [caseIndex, armCase] of processSet.cases.entries()) {
      for (const arm of armOrderForCase(caseIndex)) {
        const executed = caseResults
          .find((c) => c.case.caseId === armCase.caseId)
          ?.arms.some((t) => t.arm === arm.id);
        const alreadyRecorded = skipped.some(
          (s) => s.caseId === armCase.caseId && s.arm === arm.id,
        );
        if (!executed && !alreadyRecorded) {
          skipped.push({ caseId: armCase.caseId, arm: arm.id, reason: stopReason });
        }
      }
    }
  }

  const runSummary: RunSummary = {
    runId,
    label: processSet.label,
    scored: processSet.scored,
    processSet: {
      setId: processSet.setId,
      hardLimits: limits,
      caseIds: processSet.cases.map((c) => c.caseId),
      ...(processSet.reportFooter
        ? { reportFooter: processSet.reportFooter }
        : {}),
    },
    pinnedConfig,
    completeness: {
      complete: stopReason === null,
      stopReason,
      sessionsUsed,
      discoveryCalls,
      costUsd: costSoFarUsd,
      skipped,
    },
    cases: caseResults,
  };
  writeFileSync(join(runDir, "run.json"), JSON.stringify(runSummary, null, 2));
  writeFileSync(join(runDir, "summary.md"), renderSummary(runSummary));
  console.log(`\nrun dir: ${runDir}`);
  console.log(
    `${stopReason ? `PARTIAL RUN — ${stopReason}; ` : ""}total cost: $${costSoFarUsd.toFixed(4)} across ${sessionsUsed} fresh CLI sessions (discovery calls included in cost)`,
  );
}

await run();
