# Architecture

This document explains how the bridge is organized, package by package, and
how data flows from a ClaudeDesign bundle to a verified Figma file.

---

## High-level flow

```
ClaudeDesign bundle                Figma file
────────────────────               ───────────
*.jsx  (structure)   ─┐
*.html (preview)     ─┼──► @cdf/core ──► IntentArtboard
colors_and_type.css  ─┘       │              │
.colorset/*.json     ─────────┘              │
                                             ▼
                                   @cdf/figma-script
                                             │
                                             ▼
                                   use_figma script (string)
                                             │
                              (Claude executes via MCP)
                                             │
                                             ▼
                                   Figma _staging page
                                             │
                                             ▼
                                   @cdf/verify (visual + structural diff)
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
                          verdict: ok                   verdict: diff
                              │                             │
                              ▼                             ▼
                       cdf promote                  fix bridge or intent
                              │
                              ▼
                       Figma canonical page
```

---

## Package layout

```
packages/
├── core/                      # deterministic library
│   ├── jsx-parser/            # @babel/parser → JsxNode tree
│   ├── token-resolver/        # cross-reference CSS/Swift/JSX tokens
│   ├── intent-builder/        # JsxNode + tokens → IntentArtboard
│   └── snapshot/              # .figma-snapshot.json cross-session memory
│
├── playwright-renderer/       # HTML preview → PNG (visual oracle)
├── figma-script/              # IntentArtboard → use_figma JS string
├── verify/                    # pixel diff + structural diff
└── cli/                       # `cdf` binary wiring all of the above
```

Each package is independently testable. `core` has no Figma/Playwright deps —
it's pure data transformation. Renderers and the CLI compose `core` with
runtime concerns.

---

## Data model — IntentArtboard

The canonical JSON the bridge produces:

```typescript
interface IntentArtboard {
  schemaVersion: 1;
  label: string;                              // "01 · Lista vazia (Padrão B)"
  screenName: string;                          // "ScreenEmpty"
  size: { width: number; height: number };     // 402 × 874
  root: IntentNode;                            // Phone tree
  drifts: IntentDriftEntry[];                  // from reconciliation
  orphans: IntentOrphanEntry[];                // unbound color literals
}
```

The `root` is a recursive `IntentNode` where each color value is either
`{kind:"color", swiftBinding: "background"}` (bound) or
`{kind:"color", isOrphan: true}` (alpha-shortcut / decorative literal).

This separation is what lets the figma-script emitter produce deterministic
output: it has the structure AND the bindings AND the literals all in one
JSON, no inference required.

---

## Token source-of-truth hierarchy

| Source | Role |
|---|---|
| **Swift `.colorset`** | Canonical (per Stoqio CLAUDE.md). RGB-float values converted to uppercase hex. |
| **CSS bundle** | Should mirror Swift. If it doesn't, `reconcile()` emits `swift-css-mismatch`. |
| **JSX `T` object** | What the HTML preview renders. Often drifts from Swift — those drifts are the visual oracle baseline. |

When `T.bg` (JSX) doesn't match `stoqio.background` (Swift), the bridge has
two options:

1. **Build the Figma using the JSX value** so it matches the HTML preview
   (current default — visual diff stays useful).
2. **Build using the Swift value** so the Figma is "correct" but the visual
   diff against the HTML preview will always show drift.

The CLI defaults to option 1 (visual fidelity to preview); the drift report
makes the JSX/Swift mismatch visible separately.

---

## The auto-layout-rules contract

`packages/figma-script/src/auto-layout-rules.ts` is the most opinionated
file in the repo. It encodes 13 silent rules of Figma auto-layout that the
emitter respects. Examples:

- `FILL_AFTER_APPEND` — `layoutSizingHorizontal = 'FILL'` only works AFTER
  the child has been appended to its auto-layout parent. Setting before
  throws.
- `RESIZE_BEFORE_SIZING` — `resize()` resets sizing modes to FIXED, so any
  HUG/FILL must be set after `resize()`.
- `TEXT_NEEDS_OWN_FONT` — Text nodes don't inherit font from a parent
  Frame. Every `createText()` must explicitly set `fontName` + `fontSize`.

These rules came from real bugs in the vertical-slice (Lista Fase 2 →
ScreenEmpty). Codifying them here is the project's main reason to exist —
they cease being tribal knowledge.

---

## Verification loop

The `_staging` page in Figma serves as a quarantine. The bridge always
builds into `_staging` first, then `cdf verify` runs:

1. **Visual diff** — `pixelmatch` between Figma node screenshot and the
   Playwright-rendered HTML, with a configurable ratio threshold.
2. **Structural diff** — walks the IntentNode tree alongside the Figma
   node tree (from `mcp__plugin_figma_figma__get_metadata`) and reports
   missing / extra / type-mismatched / name-mismatched nodes.

Only when both pass does `cdf promote` move the validated frame from
`_staging` to the canonical Screens page.

The snapshot file (`.figma-snapshot.json`) tracks each screen's lifecycle
state: `staging` → `verified` → `promoted`.

---

## Why TypeScript

Every other piece in this stack is JS:

- `use_figma` runs JavaScript inside the Figma Plugin host.
- The HTML preview loads JSX via Babel-standalone in the browser.
- Playwright drives a Node-based browser.

TypeScript at the boundary means the same `colorExpr()` helper that runs
during emit-time can be linted against the same shape that figma-script
expects at runtime, and the script generator can be tested by examining
its output string without needing Figma at all.
