import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CatalogTool } from "../evaluation/full-tools/server.js";

const CATALOG_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../evaluation/catalog/tool-catalog.json",
);
const SOURCE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../evaluation/catalog/wind-skills-source",
);

const PINNED_REVISION = "495884408b1da1f8d5fa55daa2b68fd510b02da3";

const EXPECTED_CATEGORY_COUNTS: Record<string, number> = {
  stock_data: 10,
  fund_data: 10,
  index_data: 6,
  bond_data: 4,
  financial_docs: 2,
  economic_data: 1,
  analytics_data: 1,
};

describe("frozen AiFinMarket Tool Catalog artifact", () => {
  const artifact = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as {
    meta: {
      source: { repo: string; revision: string; snapshotHash: string };
      transformation: { script: string; method: string };
      artifactHash: string;
      toolCount: number;
    };
    tools: CatalogTool[];
  };

  it("records the pinned wind-skills source revision, transformation, and a matching artifact hash", () => {
    expect(artifact.meta.source.repo).toBe(
      "https://github.com/Wind-Information-Co-Ltd/wind-skills",
    );
    expect(artifact.meta.source.revision).toBe(PINNED_REVISION);
    expect(artifact.meta.transformation.script).toBe(
      "evaluation/catalog/build-catalog.mjs",
    );
    expect(artifact.meta.transformation.method).toContain("derived");

    const recomputed = createHash("sha256")
      .update(JSON.stringify(artifact.tools))
      .digest("hex");
    expect(artifact.meta.artifactHash).toBe(`sha256:${recomputed}`);
    expect(artifact.meta.toolCount).toBe(artifact.tools.length);

    const sourceFiles = [
      "tool-manifest.json",
      "references/stock.md",
      "references/fund.md",
      "references/index.md",
      "references/bond.md",
      "references/financial-docs.md",
      "references/economic.md",
      "references/analytics.md",
    ];
    const recomputedSnapshot = createHash("sha256")
      .update(
        sourceFiles
          .map(
            (f) =>
              `${f}:${createHash("sha256").update(readFileSync(join(SOURCE_DIR, f))).digest("hex")}`,
          )
          .join("\n"),
      )
      .digest("hex");
    expect(artifact.meta.source.snapshotHash).toBe(
      `sha256:${recomputedSnapshot}`,
    );
  });

  it("contains exactly 34 tools across the seven published server categories", () => {
    expect(artifact.tools).toHaveLength(34);
    const counts: Record<string, number> = {};
    for (const tool of artifact.tools) {
      counts[tool.serverCategory] = (counts[tool.serverCategory] ?? 0) + 1;
    }
    expect(counts).toEqual(EXPECTED_CATEGORY_COUNTS);
  });

  it("gives every tool a name, description, object-root inputSchema, and derived-from-docs provenance", () => {
    for (const tool of artifact.tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.provenance.schemaSource).toBe(
        "derived-from-reference-docs",
      );
      for (const [field, schema] of Object.entries(
        tool.inputSchema.properties ?? {},
      )) {
        expect(field, `${tool.name} has a malformed property name`).toMatch(
          /^[a-zA-Z][a-zA-Z0-9_]*$/,
        );
        expect(
          schema["x-provenance"],
          `${tool.name}.${field} must carry field-level derived provenance`,
        ).toBe("derived-from-reference-docs");
      }
    }
  });

  it("derives get_stock_kline parameters from the stock contract doc", () => {
    const kline = artifact.tools.find((t) => t.name === "get_stock_kline");
    expect(kline).toBeDefined();
    expect(kline!.inputSchema.required).toEqual([
      "windcode",
      "begin_date",
      "end_date",
    ]);
    const period = kline!.inputSchema.properties!["period"]!;
    expect(period["enum"]).toContain("1d");
    expect(period["default"]).toBe("1d");
  });
});
