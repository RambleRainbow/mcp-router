# Vendored wind-skills Source

Evaluation-only source snapshot used to derive the frozen AiFinMarket Tool
Catalog. Not part of the Router product.

- **Repo**: https://github.com/Wind-Information-Co-Ltd/wind-skills
- **Revision**: `495884408b1da1f8d5fa55daa2b68fd510b02da3` (2026-08-06, "更新skill")
- **Source path within repo**: `skills/wind-mcp-skill/`
- **Retrieved**: 2026-08-09 via `git clone` + `git checkout <revision>`

## Vendored files

`tool-manifest.json` lists the 34 tool names across the seven published
server categories. The seven `references/*.md` files are the per-category
tool contracts from which descriptions and parameter tables are derived.
The `-indicators.md` field-list companions are intentionally not vendored:
no derived schema enumerates `indexes` values, and the `indexes` parameter
description points the caller at those docs verbatim.

| File | SHA-256 |
| --- | --- |
| `tool-manifest.json` | `2088ec4998300a6aeb05a8592e8944abb95e2f4258b890c1fed3831eb589325b` |
| `references/analytics.md` | `94dc28fea130a8ee066c5c707b73b78a6032f2511b5412783a9e0fb02d097be9` |
| `references/bond.md` | `e8148d90230a82a8993aa8aa992fcf2779ceea4256c0b5c386e7b5850734d451` |
| `references/economic.md` | `b8b29fbb8bdbc3993edc3966bb9ec5148784d264538845000abef48457e03136` |
| `references/financial-docs.md` | `9a562242830a6bc439448b82417943bb4b74587bf9fc5e4dba0dc81520400da2` |
| `references/fund.md` | `38eb182f4e9ae6ffab7b650ecb380414d1360142a4f0a0c4e64040a9d30d3a7f` |
| `references/index.md` | `c94f19885f2d9ebac7930f9bcd85d784a53a7faa1c1f8bd1f9bc70162cf82fb2` |
| `references/stock.md` | `01a3bb9b23bd41c64bf27dca45046ed88c012a8ee1dad9b562d4b2704783f0a3` |

The combined hash of these files is recorded as `meta.source.snapshotHash`
in `../tool-catalog.json`, so `npm run catalog:check` fails if any vendored
file drifts from the snapshot the artifact was built from.
