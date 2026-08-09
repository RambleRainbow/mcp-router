import { readFileSync } from "node:fs";

/**
 * One synthetic, non-scored three-arm case declaration (issue #7). Loaded
 * from JSON so the case is data, reviewable and diffable on its own.
 */

/** Default case declaration used by every three-arm entrypoint. */
export const DEFAULT_CASE_PATH = "evaluation/three-arm/case-001.json";

/** The locked Reference Agent model (ADR-0003); also used for Simple Router discovery. */
export const REFERENCE_AGENT_MODEL = "claude-opus-5[1m]";

export interface ThreeArmCase {
  caseId: string;
  kind: string;
  scored: boolean;
  label: string;
  userPrompt: string;
  acceptableTools: string[];
  /** Arguments the case requires the Agent to supply. */
  requiredArguments: string[];
  /** Acceptable values per argument; absence of an optional arg means "default". */
  acceptableArguments: Record<string, unknown[]>;
  clarification: string;
  resultFixture: unknown;
  successRubric: Array<{ id: string; check: string }>;
}

/** Loads a three-arm case declaration from its JSON file. */
export function loadThreeArmCase(path: string): ThreeArmCase {
  return JSON.parse(readFileSync(path, "utf8")) as ThreeArmCase;
}
