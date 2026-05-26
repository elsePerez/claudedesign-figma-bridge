# claudedesign-figma-bridge

> Deterministic bridge that translates [Claude Design](https://claude.ai/design) bundles (JSX + HTML) into Figma files, with visual + structural diff verification.

**Status:** scaffold complete (Phases 0-9 wired). Pre-1.0 — internal/early use.

---

## The problem

Translating a Claude Design bundle into Figma by hand (or via an LLM) produces **grotesque, visually obvious mistakes** even when the agent has the full bundle available:

- `<button>` becomes a `Frame` and loses CSS inline-flex defaults
- `display: flex; align-items: center` translates into Figma auto-layout with the wrong sizing-mode sequence and items end up clipped
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
.colorset/*.json     ─┘                       ▼
                                          verify (diff)
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              ✅ promote         ❌ report drift
```

**Source of truth split:**
- **Structure** (Artboards, hierarchy, layout) → JSX (parsed via Babel)
- **Tokens** (colors, spacing, radius, typography) → Swift colorsets / CSS bundle (cross-referenced)
- **Visual oracle** (what Figma must match) → Playwright render of the HTML

**Verification:** every screen built in Figma is compared against the Playwright-rendered HTML, both visually (pixel diff) and structurally (tree diff). Only verified screens are promoted from `_staging` to a canonical page.

---

## Quickstart

```bash
git clone git@github.com:elsePerez/claudedesign-figma-bridge.git
cd claudedesign-figma-bridge
pnpm install
pnpm test           # 89 tests, ~3s
```

### Slash commands (Claude Code)

The repo ships three project-local slash commands in `.claude/commands/`.
Run Claude Code from the repo root and use:

```
/cdf-clone                # build every Artboard from the configured bundle into _staging
/cdf-screen ScreenEmpty   # build a single screen (the daily-driver command)
/cdf-review               # READ-ONLY: diff every tracked screen vs the bundle
/cdf-review ScreenEmpty   # review just one screen
```

**Setup:**

1. Copy `cdf.config.example.json` to `cdf.config.json` (gitignored).
2. Fill in the absolute paths for your bundle + the Figma file key + the staging page node id.
3. The first invocation will guide you through any missing pieces.

The commands wire together the CLI (`cdf parse/plan/emit/render`), the Figma MCP (`use_figma`, `get_metadata`, `get_screenshot`), and the snapshot store. Each command's full instructions live in its markdown file under `.claude/commands/`.

### CLI

```bash
# List Artboards in a bundle
pnpm tsx packages/cli/src/bin.ts parse path/to/screen.jsx

# Cross-reference tokens (CSS + Swift + JSX) → drift table
pnpm tsx packages/cli/src/bin.ts tokens \
  --jsx screen.jsx --css tokens.css --swift /path/to/colorsets

# Build the IntentArtboard for one screen
pnpm tsx packages/cli/src/bin.ts plan \
  --jsx screen.jsx --screen ScreenEmpty --label "01 · Empty" \
  --css tokens.css --swift /path/to/colorsets \
  --out intent.json

# Convert intent to a use_figma script string
pnpm tsx packages/cli/src/bin.ts emit \
  --intent intent.json --page 6504:2 --out script.js

# Render HTML preview to PNG (visual oracle)
pnpm tsx packages/cli/src/bin.ts render \
  --bundle ./bundle --html screen.html --label "Artboard label" \
  --out reference.png
```

The `use_figma` script is fed to your Figma MCP / Plugin runtime to actually build the file. The bridge stays out of that loop intentionally — it produces a deterministic, inspectable string.

---

## Repo layout

```
packages/
├── core/                      # deterministic library (no Figma/Playwright deps)
│   ├── jsx-parser/            # @babel/parser → JsxNode tree
│   ├── token-resolver/        # cross-reference CSS/Swift/JSX tokens
│   ├── intent-builder/        # JsxNode + tokens → IntentArtboard JSON
│   └── snapshot/              # .figma-snapshot.json (cross-session memory)
│
├── playwright-renderer/       # HTML preview → PNG
├── figma-script/              # IntentArtboard → use_figma JS string + auto-layout-rules
├── verify/                    # pixel diff + structural diff
└── cli/                       # `cdf` binary wiring all of the above

docs/
├── architecture.md
├── auto-layout-rules.md       # the 13 silent Figma auto-layout rules, codified
└── community-guide.md         # adapting to non-Stoqio projects

examples/
└── stoqio/                    # reference example using the test fixtures
```

---

## Phases

| Phase | What | Status |
|---|---|---|
| 0 | Repo scaffold + CI | ✅ |
| 1 | `core/jsx-parser` (Babel AST → Artboard tree) | ✅ |
| 2 | `core/token-resolver` (CSS + Swift + JSX cross-reference) | ✅ |
| 3 | `core/intent-builder` (JsxNode + tokens → IntentArtboard) | ✅ |
| 4 | `renderers/playwright-renderer` (HTML → PNG) | ✅ |
| 5 | `figma-script` + `auto-layout-rules` | ✅ |
| 6 | `cli` (parse, tokens, plan, emit, render) | ✅ |
| 7 | `verify` (visual + structural diff) | ✅ |
| 8 | `core/snapshot` (lifecycle store) | ✅ |
| 9 | Docs + community guide | ✅ |

---

## Why TypeScript

Every other piece in this stack is JavaScript:

- `use_figma` runs JS inside the Figma Plugin host.
- The HTML preview loads JSX via Babel-standalone in the browser.
- Playwright drives a Node-based browser.

TypeScript at the boundary means the same `colorExpr()` helper that runs during emit-time can be linted against the same shape the figma-script emitter expects at runtime, and the script generator can be tested by examining its output string without needing Figma at all.

---

## Tests

```bash
pnpm test            # 89 tests, ~3s
pnpm test:watch
pnpm lint            # tsc -b
```

Test breakdown:
- **Smoke** (1) — package boots
- **jsx-parser** (14) — Babel AST parsing + Artboard extraction + tree normalization
- **token-resolver** (32) — CSS/Swift/JSX loaders + drift reconciliation
- **intent-builder** (7) — JsxNode + tokens → IntentArtboard
- **figma-script** (11) — auto-layout helpers + use_figma script emission
- **verify** (8) — visual diff (pixelmatch) + structural diff
- **cli** (4) — command roundtrips
- **playwright-renderer** (4) — local HTTP server (Playwright browser not auto-launched in CI)
- **snapshot** (8) — lifecycle store

---

## License

MIT — see [LICENSE](./LICENSE).

---

> Built from a hard-earned lesson: when an LLM agent produces visually wrong Figma files despite having the full source bundle, the fix is not "better prompts" — it's removing the agent from the translation path entirely.
