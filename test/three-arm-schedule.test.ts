import { describe, expect, it } from "vitest";
import {
  armOrderForCase,
  budgetExceeded,
} from "../evaluation/three-arm/schedule.js";

/**
 * Scheduling rules for the process-MVP runner (issue #8): arm order is
 * counterbalanced across cases, and execution stops before exceeding either
 * hard limit (18 sessions / USD 10).
 */
describe("counterbalanced arm order", () => {
  it("rotates the arm order by case index", () => {
    expect(armOrderForCase(0).map((a) => a.id)).toEqual([
      "A-full-tools",
      "B-oracle-router",
      "C-simple-router",
    ]);
    expect(armOrderForCase(1).map((a) => a.id)).toEqual([
      "B-oracle-router",
      "C-simple-router",
      "A-full-tools",
    ]);
    expect(armOrderForCase(2).map((a) => a.id)).toEqual([
      "C-simple-router",
      "A-full-tools",
      "B-oracle-router",
    ]);
    expect(armOrderForCase(3).map((a) => a.id)).toEqual(
      armOrderForCase(0).map((a) => a.id),
    );
  });

  it("puts each arm in each position exactly twice across six cases", () => {
    const positionCounts = new Map<string, [number, number, number]>();
    for (let index = 0; index < 6; index++) {
      armOrderForCase(index).forEach((arm, position) => {
        const counts = positionCounts.get(arm.id) ?? [0, 0, 0];
        counts[position]!++;
        positionCounts.set(arm.id, counts);
      });
    }
    for (const counts of positionCounts.values()) {
      expect(counts).toEqual([2, 2, 2]);
    }
    expect(positionCounts.size).toBe(3);
  });
});

describe("hard-limit budget guard", () => {
  const limits = { maxSessions: 18, maxCostUsd: 10 };

  it("allows execution below both limits", () => {
    expect(budgetExceeded(0, 0, limits)).toBe(false);
    expect(budgetExceeded(17, 9.99, limits)).toBe(false);
  });

  it("stops at the session limit", () => {
    expect(budgetExceeded(18, 0, limits)).toBe(true);
  });

  it("stops at the cost limit", () => {
    expect(budgetExceeded(0, 10, limits)).toBe(true);
    expect(budgetExceeded(3, 10.5, limits)).toBe(true);
  });
});
