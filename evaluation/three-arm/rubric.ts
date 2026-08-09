import type { ThreeArmCase } from "./case.js";
import type { ArmTrace } from "./trace.js";
import { CATALOG_BY_NAME } from "../full-tools/server.js";

/**
 * Process-only rubric evaluation for a three-arm run (issues #7/#8):
 * mechanical checks against the case declaration. Every invoked acceptable
 * tool call is validated against that tool's own expectations; an empty
 * acceptable-value list means "any value, recorded but not judged".
 * Verdicts say only whether the process executed as declared — they never
 * rank arms or judge answer quality.
 */
export function evaluateRubric(
  armCase: ThreeArmCase,
  armId: string,
  trace: ArmTrace,
): Array<{ id: string; verdict: string; evidence: string }> {
  const isRouterArm = armId !== "A-full-tools";

  // Resolve every acceptable-tool invocation: direct (arm A) or via
  // call_tool whose toolRef maps to an acceptable candidate (arms B/C).
  const invokedCalls: Array<{ name: string; args: Record<string, unknown> }> =
    [];
  if (!isRouterArm) {
    for (const call of trace.toolCalls) {
      if (armCase.acceptableTools.includes(call.tool)) {
        invokedCalls.push({ name: call.tool, args: call.arguments });
      }
    }
  } else {
    const refToName = new Map(Object.entries(trace.toolRefToName ?? {}));
    for (const call of trace.toolCalls) {
      if (call.tool !== "call_tool") continue;
      const name = refToName.get(String(call.arguments["toolRef"]));
      if (name && armCase.acceptableTools.includes(name)) {
        invokedCalls.push({
          name,
          args: (call.arguments["arguments"] as Record<string, unknown>) ?? {},
        });
      }
    }
  }

  const argumentViolations: string[] = [];
  const undeclaredExtras: string[] = [];
  for (const invoked of invokedCalls) {
    const expectation = armCase.toolExpectations[invoked.name]!;
    for (const required of expectation.requiredArguments) {
      if (!(required in invoked.args)) {
        argumentViolations.push(`${invoked.name}: 缺少必填参数 ${required}`);
      }
    }
    for (const [arg, acceptable] of Object.entries(
      expectation.acceptableArguments,
    )) {
      if (
        arg in invoked.args &&
        acceptable.length > 0 &&
        !acceptable.includes(invoked.args[arg])
      ) {
        argumentViolations.push(
          `${invoked.name}: ${arg}=${JSON.stringify(invoked.args[arg])} 不在可接受取值内`,
        );
      }
    }
    const schemaProperties =
      CATALOG_BY_NAME.get(invoked.name)!.inputSchema.properties ?? {};
    for (const arg of Object.keys(invoked.args)) {
      if (!(arg in expectation.acceptableArguments)) {
        undeclaredExtras.push(
          `${invoked.name}.${arg}${arg in schemaProperties ? "" : "（不在 inputSchema 中!）"}`,
        );
      }
    }
  }

  const answer = trace.finalAnswer ?? "";
  const mentionsMock = /mock|模拟|仿真|示例数据/i.test(answer);

  const argsEvidence = () => {
    if (invokedCalls.length === 0) return "无可评估的工具调用";
    const parts: string[] = [];
    if (argumentViolations.length > 0) {
      parts.push(`违规: ${argumentViolations.join("；")}`);
    } else {
      parts.push("声明参数均在可接受取值内");
    }
    if (undeclaredExtras.length > 0) {
      parts.push(`另有未声明参数（仅记录、不判定）: ${undeclaredExtras.join(", ")}`);
    }
    return parts.join("；");
  };

  return [
    {
      id: "invoked_acceptable_tool",
      verdict: invokedCalls.length > 0 ? "pass" : "fail",
      evidence:
        invokedCalls.length > 0
          ? `调用了 ${invokedCalls.map((c) => c.name).join(", ")}`
          : `未调用 acceptableTools；实际调用: ${trace.toolCalls.map((c) => c.tool).join(", ") || "无"}`,
    },
    {
      id: "arguments_acceptable",
      verdict:
        invokedCalls.length > 0 && argumentViolations.length === 0
          ? "pass"
          : invokedCalls.length > 0
            ? "fail"
            : "unknown",
      evidence: argsEvidence(),
    },
    {
      id: "reported_mock_data",
      verdict: mentionsMock ? "pass" : "unknown",
      evidence: mentionsMock
        ? "最终回答包含 mock/模拟 字样"
        : "最终回答未检出 mock/模拟 字样，需人工核对",
    },
    {
      id: "process_only",
      verdict: "declared",
      evidence: "本运行只验证流程可执行、可测量，不对 arm 排名",
    },
  ];
}
