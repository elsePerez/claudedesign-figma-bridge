# Example — Stoqio (Lista Fase 2)

This is the canonical reference example that the bridge was built against.

## What's in the example

The actual ClaudeDesign bundle isn't checked in (it lives in a designer's
Downloads folder), but the bridge's test fixtures contain the same files:

- `packages/core/tests/fixtures/lista-screen.jsx` (38KB, 880 lines)
- `packages/core/tests/fixtures/editor-pos-scan.jsx` (55KB, 1380 lines)
- `packages/core/tests/fixtures/bundle-colors-and-type.css` (10KB)
- `packages/core/tests/fixtures/swift-colorsets/*.colorset/Contents.json`

## Running the bridge against the fixtures

```bash
# List all 24 Artboards in Lista
pnpm tsx packages/cli/src/bin.ts parse \
  packages/core/tests/fixtures/lista-screen.jsx

# Dump the ScreenEmpty tree as JSON
pnpm tsx packages/cli/src/bin.ts parse \
  packages/core/tests/fixtures/lista-screen.jsx \
  --screen ScreenEmpty

# Cross-reference all three token sources
pnpm tsx packages/cli/src/bin.ts tokens \
  --jsx   packages/core/tests/fixtures/lista-screen.jsx \
  --css   packages/core/tests/fixtures/bundle-colors-and-type.css \
  --swift packages/core/tests/fixtures/swift-colorsets

# Build the IntentArtboard for ScreenEmpty
pnpm tsx packages/cli/src/bin.ts plan \
  --jsx   packages/core/tests/fixtures/lista-screen.jsx \
  --css   packages/core/tests/fixtures/bundle-colors-and-type.css \
  --swift packages/core/tests/fixtures/swift-colorsets \
  --screen ScreenEmpty \
  --label "01 · Lista vazia (Padrão B)" \
  --out /tmp/screen-empty-intent.json

# Emit the use_figma script targeting the Stoqio _staging page
pnpm tsx packages/cli/src/bin.ts emit \
  --intent /tmp/screen-empty-intent.json \
  --page 6504:2 \
  --out /tmp/screen-empty.use-figma.js
```

## What this example demonstrates

- **Multi-Artboard canvas** — Lista's `lista-screen.jsx` has 24 Artboards
  (states/variants). The bridge produces one IntentArtboard per Artboard.
- **Cross-source drift** — Stoqio's Swift colorsets are canonical, the CSS
  bundle should mirror them, the JSX `T` object drifts in 6/12 tokens.
  The bridge reproduces this exact drift table.
- **Alpha-shortcut orphans** — the JSX uses `rgba(33,33,33,.06)` where the
  canonical token is `stoqio.outlineVariant` (`#BDBDBD`). The bridge
  flags this as an orphan (no Swift hex match) for the designer's review.
