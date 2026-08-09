#!/usr/bin/env node
/**
 * Derives the frozen AiFinMarket Tool Catalog from the vendored wind-skills
 * source snapshot (see wind-skills-source/SOURCE.md).
 *
 * Transformation method: read `tool-manifest.json` for the 34 tool names
 * across the seven published server categories; for each tool, parse its
 * `### <tool>` contract section in the category's reference doc —
 * description = prose above the parameter table; inputSchema = object-root
 * JSON Schema derived from the parameter table (必填 → required,
 * 类型 → type, 枚举 → enum, 示例/默认 → default, 官方说明 → description).
 * Every schema is derived from public reference documentation, NOT captured
 * from live tools/list output, and is marked as such per field.
 *
 * Usage:
 *   node evaluation/catalog/build-catalog.mjs          # write tool-catalog.json
 *   node evaluation/catalog/build-catalog.mjs --check  # verify artifact is up to date
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(HERE, "wind-skills-source");
const ARTIFACT_PATH = join(HERE, "tool-catalog.json");

const PINNED_REVISION = "495884408b1da1f8d5fa55daa2b68fd510b02da3";
const DERIVED = "derived-from-reference-docs";

const REFERENCE_FILES = {
  stock_data: "references/stock.md",
  fund_data: "references/fund.md",
  index_data: "references/index.md",
  bond_data: "references/bond.md",
  financial_docs: "references/financial-docs.md",
  economic_data: "references/economic.md",
  analytics_data: "references/analytics.md",
};

const JSON_SCHEMA_TYPES = new Set(["string", "number", "integer", "boolean"]);

/** Parses one reference doc into { toolName: { description, params } }. */
function parseReferenceDoc(filePath) {
  const lines = readFileSync(filePath, "utf8").split("\n");
  const sections = new Map();
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^### `([a-z0-9_]+)`\s*$/);
    if (heading) {
      current = { description: [], table: [] };
      sections.set(heading[1], current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("|")) current.table.push(line);
    else if (current.table.length === 0) current.description.push(line);
  }

  const tools = new Map();
  for (const [name, section] of sections) {
    tools.set(name, {
      description: section.description.join("\n").trim(),
      params: parseParamTable(name, section.table),
    });
  }
  return tools;
}

function parseParamTable(toolName, tableLines) {
  const rows = tableLines.filter((line) => {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    return (
      !cells.every((c) => /^:?-+:?$/.test(c)) && !line.startsWith("| 参数 |")
    );
  });
  return rows.map((line) => {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 6) {
      throw new Error(
        `${toolName}: expected 6 table cells, got ${cells.length}: ${line}`,
      );
    }
    const [rawName, required, rawType, rawEnum, exampleDefault, note] = cells;
    const name = rawName.replace(/`/g, "");
    const type = rawType.toLowerCase();
    const schema = { type: JSON_SCHEMA_TYPES.has(type) ? type : "string" };
    if (!JSON_SCHEMA_TYPES.has(type)) {
      console.warn(`warn: ${toolName}.${name}: unmapped type "${rawType}", using "string"`);
    }
    if (note && note !== "—") schema.description = note;
    if (rawEnum !== "—") {
      schema.enum = rawEnum.split(" / ").map((v) => v.trim());
    }
    const defaultMatch = exampleDefault.match(/默认\s*[:：]?\s*"?([^"]+?)"?\s*$/);
    if (defaultMatch) schema.default = defaultMatch[1];
    schema["x-provenance"] = DERIVED;
    return { name, required: required === "是", schema };
  });
}

function buildTools() {
  const manifest = JSON.parse(
    readFileSync(join(SOURCE_DIR, "tool-manifest.json"), "utf8"),
  );
  const tools = [];
  for (const [category, toolNames] of Object.entries(manifest)) {
    const referenceFile = REFERENCE_FILES[category];
    if (!referenceFile) throw new Error(`no reference doc for ${category}`);
    const parsed = parseReferenceDoc(join(SOURCE_DIR, referenceFile));
    for (const toolName of toolNames) {
      const contract = parsed.get(toolName);
      if (!contract) {
        throw new Error(`${toolName}: no contract section in ${referenceFile}`);
      }
      const required = contract.params
        .filter((p) => p.required)
        .map((p) => p.name);
      tools.push({
        name: toolName,
        serverCategory: category,
        description: contract.description,
        inputSchema: {
          type: "object",
          properties: Object.fromEntries(
            contract.params.map((p) => [p.name, p.schema]),
          ),
          required,
        },
        provenance: {
          schemaSource: DERIVED,
          note: "Derived from the public wind-skills reference docs at the pinned revision; NOT captured from live tools/list output.",
          referenceFile,
        },
      });
    }
  }
  return tools;
}

const tools = buildTools();

/** Binds the artifact to the exact vendored source bytes, so `--check`
 * fails if any vendored file drifts from the snapshot built from. */
const SOURCE_FILES = [
  "tool-manifest.json",
  ...Object.values(REFERENCE_FILES),
];
const sourceSnapshotHash = createHash("sha256")
  .update(
    SOURCE_FILES.map(
      (f) =>
        `${f}:${createHash("sha256").update(readFileSync(join(SOURCE_DIR, f))).digest("hex")}`,
    ).join("\n"),
  )
  .digest("hex");

const artifact = {
  meta: {
    catalogId: "aifinmarket-tool-catalog",
    purpose:
      "Evaluation-only Full Tools experiment arm (issue #6). Not part of the frozen Router product.",
    source: {
      repo: "https://github.com/Wind-Information-Co-Ltd/wind-skills",
      revision: PINNED_REVISION,
      vendoredSnapshot: "evaluation/catalog/wind-skills-source/",
      snapshotHash: `sha256:${sourceSnapshotHash}`,
    },
    transformation: {
      script: "evaluation/catalog/build-catalog.mjs",
      method:
        "Tool names taken from tool-manifest.json; description and object-root inputSchema derived from each tool's parameter table in the vendored reference docs (required/type/enum/default/description columns). All schemas are derived from public reference documentation, not live tools/list output.",
    },
    toolCount: tools.length,
    serverCategories: Object.keys(REFERENCE_FILES),
    artifactHash: `sha256:${createHash("sha256").update(JSON.stringify(tools)).digest("hex")}`,
  },
  tools,
};

const serialized = JSON.stringify(artifact, null, 2) + "\n";

if (process.argv.includes("--check")) {
  const existing = readFileSync(ARTIFACT_PATH, "utf8");
  if (existing !== serialized) {
    console.error(
      "tool-catalog.json is stale; run `node evaluation/catalog/build-catalog.mjs`",
    );
    process.exit(1);
  }
  console.log(`tool-catalog.json up to date (${artifact.meta.artifactHash})`);
} else {
  writeFileSync(ARTIFACT_PATH, serialized);
  console.log(
    `wrote ${ARTIFACT_PATH}: ${tools.length} tools, ${artifact.meta.artifactHash}`,
  );
}
