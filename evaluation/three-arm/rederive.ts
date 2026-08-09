import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { evaluateRubric } from "./rubric.js";
import {
  renderSummary,
  type CaseResult,
  type RunSummary,
} from "./summary.js";
import { parseArmTrace, parseStreamEvents, totalArmCost } from "./trace.js";

/**
 * Re-derives the traces, run.json, and summary.md of a recorded process-MVP
 * run from its immutable raw stream-json logs — e.g. after a harness-side
 * trace-parsing fix. Raw evidence (*.raw.jsonl, *.mcp.json) is never
 * touched; the re-derivation is recorded in run.json under `rederived` with
 * an explicit reason.
 *
 * Run with: npm run eval:three-arm:rederive -- <runDir> "<reason>"
 */

const execFileAsync = promisify(execFile);

const [, , runDir, reason] = process.argv;
if (!runDir || !reason) {
  throw new Error('usage: tsx rederive.ts <runDir> "<reason>"');
}

const old = JSON.parse(
  readFileSync(join(runDir, "run.json"), "utf8"),
) as RunSummary;
const { stdout: codeRevisionRaw } = await execFileAsync("git", [
  "rev-parse",
  "HEAD",
]);

const cases: CaseResult[] = [];
let sessionsUsed = 0;
let discoveryCalls = 0;
let costSoFarUsd = 0;

for (const oldCase of old.cases) {
  const caseDir = join(runDir, oldCase.case.caseId);
  const caseResult: CaseResult = { ...oldCase, arms: [] };
  cases.push(caseResult);

  for (const oldArm of oldCase.arms) {
    const raw = readFileSync(join(caseDir, `${oldArm.arm}.raw.jsonl`), "utf8");
    const trace = parseArmTrace(
      oldArm.arm,
      parseStreamEvents(raw),
      null,
      oldArm.latencyMs ?? 0,
      oldArm.prompt,
    );
    // Preserve errors recorded at run time (e.g. spawn failures); they are
    // not reproducible from the raw stream alone.
    trace.errors = [...new Set([...trace.errors, ...oldArm.errors])];
    trace.rubric = evaluateRubric(oldCase.case, oldArm.arm, trace);
    writeFileSync(
      join(caseDir, `${oldArm.arm}.trace.json`),
      JSON.stringify(trace, null, 2),
    );
    caseResult.arms.push(trace);
    sessionsUsed++;
    if (trace.discoveryMeta !== null) discoveryCalls++;
    costSoFarUsd += totalArmCost(trace);
    console.log(
      `${oldCase.case.caseId} / ${oldArm.arm}: rubric ${trace.rubric.map((r) => `${r.id}=${r.verdict}`).join(" ")}`,
    );
  }
}

const runSummary: RunSummary = {
  ...old,
  completeness: {
    ...old.completeness,
    sessionsUsed,
    discoveryCalls,
    costUsd: costSoFarUsd,
  },
  cases,
  rederived: {
    at: new Date().toISOString(),
    codeRevision: codeRevisionRaw.trim(),
    reason,
  },
};
writeFileSync(join(runDir, "run.json"), JSON.stringify(runSummary, null, 2));
writeFileSync(join(runDir, "summary.md"), renderSummary(runSummary));
console.log(
  `\nrederived ${runDir}: $${costSoFarUsd.toFixed(4)} across ${sessionsUsed} sessions`,
);
