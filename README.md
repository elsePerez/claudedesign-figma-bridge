# claudedesign-figma-bridge

> Deterministic bridge that translates [Claude Design](https://claude.ai/design) bundles (JSX + HTML) into Figma files, with visual + structural diff verification.

**Status:** 🚧 early scaffold — Fase 0 of the 9-phase plan.

---

## The problem

Translating a Claude Design bundle into Figma by hand (or via an LLM) produces **grotesque, visually obvious mistakes** even when the agent has the full bundle available:

- `<button>` becomes a `Frame` and loses CSS inline-flex defaults
- `display: flex; align-items: center` translates into a Figma auto-layout with the wrong sizing-mode sequence and items end up clipped
- `padding: 14px 14px` is mentally computed against a `flex` child of `48×48` and the math drifts
- The same prompt produces slightly different code on a second run

Each error is fixable in isolation. None is silently visible. **The error class itself is the bug.**

This repo eliminates the error class by moving the JSX → Figma translation out of LLM inference and into deterministic, tested code.

## The approach

```
ClaudeDesign bundle             Figma (target file)
─────────────────────           ─────────────────────────
*.jsx  (structure)   ─┐
*.html (preview)     ─┼──►  bridge  ──►  _staging page
colors_and_type.css  ─┘                       │
.registry-snapshot   ─┘                       ▼
                                          verify (diff)
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              ✅ promote         ❌ report drift
```

**Source of truth split:**
- **Structure** (Artboards, hierarchy, layout) → JSX (parsed deterministically)
- **Tokens** (colors, spacing, radius, typography) → Swift colorsets / CSS bundle (cross-referenced)
- **Visual oracle** (what Figma must match) → Playwright render of the HTML

**Verification:** every screen built in Figma is compared against the Playwright-rendered HTML, both visually (pixel diff) and structurally (tree diff). Only verified screens are promoted from `_staging` to a canonical page.

## CLI (planned)

```bash
cdf parse ./bundle                            # bundle.json (Artboards + tree)
cdf tokens build --css colors_and_type.css \
                 --swift Tokens/              # token-map.json + drift report
cdf plan ScreenEmpty                          # intent.json + use_figma script preview
cdf build ScreenEmpty --figma-file <key> \
                       --page _staging        # build on staging
cdf render ScreenEmpty                        # Playwright PNG
cdf verify ScreenEmpty --figma-file <key>     # visual + structural diff
cdf promote ScreenEmpty --to Screens          # move validated frames to canonical page
```

## Repo layout

```
packages/
  core/                   # deterministic logic (jsx-parser, token-resolver, intent-builder, tree-diff, snapshot)
  renderers/playwright/   # HTML → PNG
  renderers/figma-script/ # intent.json → use_figma JS string
  cli/                    # cdf binary
  claude-integration/     # optional skill + agent for Claude Code
examples/
  stoqio/                 # reference bundle for development
docs/
  architecture.md
  auto-layout-rules.md
  token-resolver.md
  community-guide.md
```

Currently scaffolded: `packages/core` (empty stub).

## Phases

| Phase | What | Status |
|---|---|---|
| 0 | Repo scaffold + CI | 🟢 in progress |
| 1 | `core/jsx-parser` (Babel AST → Artboard tree) | ⏳ |
| 2 | `core/token-resolver` (CSS + Swift + JSX cross-reference) | ⏳ |
| 3 | `core/intent-builder` (JSX tree + tokens → intent.json) | ⏳ |
| 4 | `renderers/playwright` (HTML → PNG) | ⏳ |
| 5 | `renderers/figma-script` + `auto-layout-rules` | ⏳ |
| 6 | `cli build` + Figma integration | ⏳ |
| 7 | `cli verify` (visual + structural diff) | ⏳ |
| 8 | `cli promote` + snapshot store | ⏳ |
| 9 | Docs + community guide + npm publish | ⏳ |

Detailed plan: see [docs/plan.md](./docs/plan.md) (mirrored from the parent project).

## Development

Requires Node ≥ 20.6 and pnpm ≥ 10.

```bash
pnpm install
pnpm test
pnpm build
```

## License

MIT — see [LICENSE](./LICENSE).

---

> Built from a hard-earned lesson: when an LLM agent produces visually wrong Figma files despite having the full source bundle, the fix is not "better prompts" — it's removing the agent from the translation path entirely.
