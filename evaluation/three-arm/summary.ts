import type { HardLimits, ThreeArmCase } from "./case.js";
import { totalArmCost, type ArmTrace } from "./trace.js";

/**
 * Shared run-record types and summary rendering for the process-MVP runner
 * and the re-derivation tool (issue #8). Kept free of side effects so both
 * can import it.
 */

export interface SkippedArm {
  caseId: string;
  arm: string;
  reason: string;
}

export interface CaseResult {
  case: ThreeArmCase;
  caseFileSha256: string;
  armOrder: string[];
  arms: ArmTrace[];
}

export interface RunSummary {
  runId: string;
  label: string;
  scored: boolean;
  processSet: {
    setId: string;
    hardLimits: HardLimits;
    caseIds: string[];
  };
  pinnedConfig: Record<string, unknown>;
  completeness: {
    complete: boolean;
    stopReason: string | null;
    /** Arm sessions used; the session limit counts one per case × arm. */
    sessionsUsed: number;
    /**
     * Extra claude CLI processes spawned by Simple Router discovery. These
     * count toward the cost limit, not the arm-session limit.
     */
    discoveryCalls: number;
    costUsd: number;
    skipped: SkippedArm[];
  };
  cases: CaseResult[];
  /** Present when derived artifacts were regenerated from the raw logs. */
  rederived?: { at: string; codeRevision: string; reason: string };
}

function renderArmCost(arm: ArmTrace): string {
  return arm.discoveryCostUsd !== null
    ? `${(arm.costUsd ?? 0).toFixed(4)} session + ${arm.discoveryCostUsd.toFixed(4)} discovery = ${totalArmCost(arm).toFixed(4)}`
    : (arm.costUsd?.toFixed(4) ?? "?");
}

export function renderSummary(run: RunSummary): string {
  const lines = [
    `# Three-Arm Process-MVP Run ${run.runId}`,
    "",
    `**NON-SCORED** — ${run.label}`,
    "",
    "## Pinned configuration",
    "",
    "```json",
    JSON.stringify(run.pinnedConfig, null, 2),
    "```",
    "",
    "## Hard-limit accounting",
    "",
    `- Arm sessions used: ${run.completeness.sessionsUsed} / ${run.processSet.hardLimits.maxSessions} (the limit counts one session per case × arm)`,
    `- Simple Router discovery CLI calls: ${run.completeness.discoveryCalls} (extra claude processes; counted toward the cost limit, not the arm-session limit)`,
    `- Model cost: $${run.completeness.costUsd.toFixed(4)} / $${run.processSet.hardLimits.maxCostUsd} (discovery calls included)`,
    run.completeness.complete
      ? `- Completeness: complete — all ${run.processSet.caseIds.length} cases ran once through A/B/C`
      : `- Completeness: **partial** — ${run.completeness.stopReason}; skipped: ${run.completeness.skipped.map((s) => `${s.caseId}/${s.arm}`).join(", ")}`,
    "",
  ];
  if (run.rederived) {
    lines.push(
      `- Rederived: traces and this summary were regenerated from the immutable raw logs at ${run.rederived.at} (code ${run.rederived.codeRevision.slice(0, 12)}); reason: ${run.rederived.reason}`,
      "",
    );
  }

  for (const caseResult of run.cases) {
    lines.push(
      `## Case: ${caseResult.case.caseId} (${caseResult.case.kind})`,
      "",
      `- User prompt: ${caseResult.case.userPrompt}`,
      `- Acceptable tools: ${caseResult.case.acceptableTools.join(", ")}`,
      `- Clarification expectation: ${caseResult.case.clarification}`,
      `- Arm order (counterbalanced): ${caseResult.armOrder.join(" → ")}`,
      `- caseFileSha256: ${caseResult.caseFileSha256}`,
      "",
      "| Arm | Candidates | Tool calls | Turns | Cost (USD) | Latency (s) | Rubric |",
      "| --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const arm of caseResult.arms) {
      lines.push(
        `| ${arm.arm} | ${arm.discoveredCandidates?.join(", ") ?? "(full catalog)"} | ${arm.toolCalls.map((c) => c.tool).join(", ") || "none"} | ${arm.numTurns ?? "?"} | ${renderArmCost(arm)} | ${((arm.latencyMs ?? 0) / 1000).toFixed(1)} | ${(arm.rubric ?? []).map((r) => `${r.id}: ${r.verdict}`).join("<br>")} |`,
      );
    }
    for (const skipped of run.completeness.skipped.filter(
      (s) => s.caseId === caseResult.case.caseId,
    )) {
      lines.push(
        `| ${skipped.arm} | — | — | — | — | — | skipped: ${skipped.reason} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Process outcome",
    "",
    "This run states only whether the evaluation process could be run and",
    `reproduced: ${run.processSet.caseIds.length} synthetic cases, one frozen Tool Catalog, equivalent`,
    "deterministic fixtures, one pass per arm, full traces preserved. It does",
    "not rank arms, does not estimate product value, and the six cases must",
    "not be reused in a later scored experiment.",
    "",
    "## Unmet prerequisites for the later 30-case scored experiment",
    "",
    "- 实名 PM：Acting PM 须由项目发起人替换为实名负责人",
    "- 两名独立金融评审人已落实，分歧裁决机制已安排",
    "- Catalog 数据负责人已实名；真实 `tools/list` 快照（或经批准的替代快照）已冻结",
    "- 30 个真实问题及可接受调用路径已完成独立标注与裁决",
    "- 实验工程师与盲评人已实名且角色分离（运行者不参与匿名金融评分）",
    "- Prompt、模型、Catalog、评分规则、预算与停止门槛已在查看正式结果前锁定",
    "",
  );
  return lines.join("\n") + "\n";
}
