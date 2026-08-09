import type { ThreeArmCase } from "./case.js";
import type { ArmTrace } from "./trace.js";
import { CATALOG_BY_NAME } from "../full-tools/server.js";

/**
 * Process-only rubric evaluation for a three-arm run (issue #7): mechanical
 * checks against the case declaration. Verdicts say only whether the process
 * executed as declared — they never rank arms or judge answer quality.
 */
export function evaluateRubric(
  armCase: ThreeArmCase,
  armId: string,
  trace: ArmTrace,
): Array<{ id: string; verdict: string; evidence: string }> {
  const isRouterArm = armId !== "A-full-tools";
  const catalogTool = CATALOG_BY_NAME.get(armCase.acceptableTools[0]!)!;

  // Resolve the acceptable-tool invocation: direct (arm A) or via call_tool
  // whose toolRef maps to an acceptable candidate (arms B/C).
  let invokedName: string | null = null;
  let invokedArgs: Record<string, unknown> | null = null;
  if (!isRouterArm) {
    const direct = trace.toolCalls.find((c) =>
      armCase.acceptableTools.includes(c.tool),
    );
    if (direct) {
      invokedName = direct.tool;
      invokedArgs = direct.arguments;
    }
  } else {
    const refToName = new Map(Object.entries(trace.toolRefToName ?? {}));
    const call = trace.toolCalls.find(
      (c) =>
        c.tool === "call_tool" &&
        armCase.acceptableTools.includes(
          refToName.get(String(c.arguments["toolRef"])) ?? "",
        ),
    );
    if (call) {
      invokedName = refToName.get(String(call.arguments["toolRef"]))!;
      invokedArgs =
        (call.arguments["arguments"] as Record<string, unknown>) ?? {};
    }
  }

  const argumentViolations: string[] = [];
  const undeclaredExtras: string[] = [];
  if (invokedArgs) {
    for (const required of armCase.requiredArguments) {
      if (!(required in invokedArgs)) {
        argumentViolations.push(`缺少必填参数 ${required}`);
      }
    }
    for (const [arg, acceptable] of Object.entries(armCase.acceptableArguments)) {
      if (arg in invokedArgs && !acceptable.includes(invokedArgs[arg])) {
        argumentViolations.push(
          `${arg}=${JSON.stringify(invokedArgs[arg])} 不在可接受取值内`,
        );
      }
    }
    const schemaProperties = catalogTool.inputSchema.properties ?? {};
    for (const arg of Object.keys(invokedArgs)) {
      if (!(arg in armCase.acceptableArguments)) {
        undeclaredExtras.push(
          arg in schemaProperties ? arg : `${arg}（不在 inputSchema 中!）`,
        );
      }
    }
  }

  const answer = trace.finalAnswer ?? "";
  const mentionsMock = /mock|模拟|仿真|示例数据/i.test(answer);

  const argsEvidence = () => {
    if (!invokedArgs) return "无可评估的工具调用";
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
      verdict: invokedName ? "pass" : "fail",
      evidence: invokedName
        ? `调用了 ${invokedName}`
        : `未调用 acceptableTools；实际调用: ${trace.toolCalls.map((c) => c.tool).join(", ") || "无"}`,
    },
    {
      id: "arguments_acceptable",
      verdict:
        invokedArgs && argumentViolations.length === 0
          ? "pass"
          : invokedArgs
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
