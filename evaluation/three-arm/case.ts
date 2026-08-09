import { readFileSync } from "node:fs";

/**
 * Synthetic, non-scored three-arm case declarations (issues #7/#8). Loaded
 * from JSON so each case is data, reviewable and diffable on its own.
 */

/** Default case declaration used by every three-arm entrypoint. */
export const DEFAULT_CASE_PATH = "evaluation/three-arm/case-001.json";

/** The frozen process set: six cases + hard limits (issue #8). */
export const PROCESS_SET_PATH = "evaluation/three-arm/process-set.json";

/** Env var that overrides the case path for the arm stdio entrypoints. */
export const CASE_PATH_ENV = "THREE_ARM_CASE_PATH";

/** The locked Reference Agent model (ADR-0003); also used for Simple Router discovery. */
export const REFERENCE_AGENT_MODEL = "claude-opus-5[1m]";

/** Per-tool invocation expectations for one acceptable tool. */
export interface ToolExpectation {
  /** Arguments the case requires the Agent to supply for this tool. */
  requiredArguments: string[];
  /**
   * Acceptable values per argument; absence of an optional arg means
   * "default", and an empty list means "any value, recorded but not judged".
   */
  acceptableArguments: Record<string, unknown[]>;
  /** Deterministic fixture returned for this tool across all arms. */
  resultFixture: unknown;
}

export interface ThreeArmCase {
  caseId: string;
  kind: string;
  scored: boolean;
  label: string;
  userPrompt: string;
  acceptableTools: string[];
  /** Per-tool expectations, keyed by exactly the acceptable tools. */
  toolExpectations: Record<string, ToolExpectation>;
  clarification: string;
  successRubric: Array<{ id: string; check: string }>;
}

/** Hard limits for a process-MVP run: execution stops at either bound. */
export interface HardLimits {
  maxSessions: number;
  maxCostUsd: number;
}

export interface ProcessSet {
  setId: string;
  scored: boolean;
  label: string;
  hardLimits: HardLimits;
  cases: ThreeArmCase[];
  /** Resolved declaration path per case, aligned with `cases`. */
  casePaths: string[];
}

/** Loads a three-arm case declaration from its JSON file. */
export function loadThreeArmCase(path: string): ThreeArmCase {
  return JSON.parse(readFileSync(path, "utf8")) as ThreeArmCase;
}

/**
 * Loads the case for an arm stdio entrypoint: the runner pins the case per
 * arm process through THREE_ARM_CASE_PATH; falls back to the default case.
 */
export function loadArmCaseFromEnv(): ThreeArmCase {
  return loadThreeArmCase(process.env[CASE_PATH_ENV] ?? DEFAULT_CASE_PATH);
}

/** Loads the frozen process set and all of its case declarations. */
export function loadProcessSet(path: string): ProcessSet {
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    setId: string;
    scored: boolean;
    label: string;
    hardLimits: HardLimits;
    caseFiles: string[];
  };
  const casePaths = raw.caseFiles.map(
    (file) => `evaluation/three-arm/${file}`,
  );
  return {
    setId: raw.setId,
    scored: raw.scored,
    label: raw.label,
    hardLimits: raw.hardLimits,
    cases: casePaths.map(loadThreeArmCase),
    casePaths,
  };
}
