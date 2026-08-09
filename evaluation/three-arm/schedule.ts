import type { HardLimits } from "./case.js";

/**
 * Scheduling rules for the process-MVP runner (issue #8): pure functions so
 * the counterbalanced arm order and the hard-limit budget guard are testable
 * without spawning any Claude session.
 */

export interface ArmSpec {
  id: string;
  entry: string;
  serverName: string;
}

/** The three evaluation arms in their canonical order. */
export const ARMS: readonly ArmSpec[] = [
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
];

/**
 * Counterbalances arm order across cases by rotating the canonical order by
 * the case index: case 0 runs A→B→C, case 1 runs B→C→A, case 2 runs C→A→B,
 * and so on. Across six cases each arm appears in each position twice.
 */
export function armOrderForCase(caseIndex: number): ArmSpec[] {
  const offset = caseIndex % ARMS.length;
  return [...ARMS.slice(offset), ...ARMS.slice(0, offset)];
}

/**
 * Whether execution must stop before launching another session: either hard
 * limit has been reached. A partial run caused by a hard limit is recorded
 * honestly rather than extended.
 */
export function budgetExceeded(
  sessionsUsed: number,
  costSoFarUsd: number,
  limits: HardLimits,
): boolean {
  return sessionsUsed >= limits.maxSessions || costSoFarUsd >= limits.maxCostUsd;
}
