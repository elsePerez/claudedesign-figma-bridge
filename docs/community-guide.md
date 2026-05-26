# Community guide — Using the bridge on a non-Stoqio project

This bridge was built for [Stoqio](https://github.com/elsePerez/Stoqio), but
nothing in it is Stoqio-specific by design. This guide walks you through
adapting the bridge to your own ClaudeDesign bundle.

---

## Prerequisites

- Node ≥ 20.6, pnpm ≥ 10
- A ClaudeDesign bundle export with at least one `*.jsx` file + matching
  `*.html` wrapper that loads JSX via `<script type="text/babel">`
- A Figma file you control (you need at least edit access)
- (Optional) Design tokens defined somewhere outside JSX — CSS custom
  properties, Swift colorsets, Android `colors.xml`, etc. The bridge can
  cross-reference any of these to detect drift.

---

## Step 1 — Install

```bash
git clone https://github.com/elsePerez/claudedesign-figma-bridge.git
cd claudedesign-figma-bridge
pnpm install
pnpm test           # confirm everything green
```

There's no `npm i -g` yet — for now, run via `pnpm tsx packages/cli/src/bin.ts`.

---

## Step 2 — Inspect your bundle

Point the CLI at your `*.jsx` file:

```bash
pnpm tsx packages/cli/src/bin.ts parse /path/to/your/bundle/your-screen.jsx
```

You should see a table of Artboards. If you don't, the bundle uses a
different Artboard wrapper tag — check `extractArtboards` and either pass
`--wrapper YourTag` (planned for v0.1) or open an issue.

---

## Step 3 — Wire your tokens (optional but recommended)

If your design system has tokens outside JSX, add them to the reconcile:

```bash
pnpm tsx packages/cli/src/bin.ts tokens \
  --jsx your-screen.jsx \
  --css your-tokens.css \
  --swift /path/to/Assets.xcassets
```

The CLI accepts any combination. If you only have CSS, just pass `--css`.
The drift report will show which JSX hex values diverge from your
canonical source.

### Naming conventions the resolver expects

- **CSS:** `--name`, `--namespace-name`, `--name-with-modifier` — kebab-case,
  camelCased after stripping a known namespace prefix
- **Swift colorsets:** named like `prefix.tokenName.colorset/` — the prefix
  is stripped to get the semantic name
- **JSX:** any `const T = { ... }` object at module scope; key `bg` is
  aliased to `background`

To add aliases for your own object keys, edit `normalize-name.ts`:

```ts
export const JSX_ALIASES = {
  bg: "background",
  // your additions:
  fg: "onSurface",
  border: "outline",
};
```

---

## Step 4 — Plan an intent

```bash
pnpm tsx packages/cli/src/bin.ts plan \
  --jsx your-screen.jsx \
  --screen YourScreenComponentName \
  --label "Some descriptive label" \
  --css your-tokens.css \
  --out intent.json
```

Open `intent.json` and confirm the tree looks right. The structure should
mirror your JSX's component hierarchy.

---

## Step 5 — Emit + build

Create a `_staging` page in your Figma file (or whatever you want to call
your quarantine page). Get its node id from the URL (the part after
`node-id=`, converted from `1-2` to `1:2`).

```bash
pnpm tsx packages/cli/src/bin.ts emit \
  --intent intent.json \
  --page YOUR_PAGE_ID \
  --out script.js
```

Open the generated `script.js` and paste it into the `use_figma` MCP tool
(or your preferred Figma Plugin runtime). It'll create the screen on your
staging page.

---

## Step 6 — Verify

Render the HTML preview to a PNG:

```bash
pnpm tsx packages/cli/src/bin.ts render \
  --bundle /path/to/your/bundle \
  --html your-screen.html \
  --label "Artboard label" \
  --out reference.png
```

Get a Figma screenshot via the Figma MCP (`get_screenshot` tool), save it
as `candidate.png`, then:

```bash
# Visual diff (uses pixelmatch under the hood)
node -e '
  const { diffImages } = require("./packages/verify/dist/index.js");
  console.log(diffImages({
    referencePath: "reference.png",
    candidatePath: "candidate.png",
    diffOutputPath: "diff.png",
    maxRatio: 0.02
  }));
'
```

If `verdict === "ok"`, your screen passes. If not, open `diff.png` to see
where the mismatch is.

---

## What if my bundle uses different conventions?

- **Different Artboard tag** — see open issue / PR #N (planned: `--wrapper`
  flag for `cdf parse`).
- **Multiple JSX files per screen** — the bridge currently parses one file
  at a time. If you have a `parent.jsx` that imports `child.jsx`, build
  separate intents for each and compose at the Figma level.
- **No token system at all** — pass only `--jsx` to `cdf tokens`. The drift
  report will only show JSX values; everything goes into `orphans`. The
  bridge still works — you just lose the binding to a canonical source.

---

## How the bridge differs from Code Connect

[Figma Code Connect](https://www.figma.com/code-connect-docs/) maps Figma
component instances to source code components. The bridge does the
opposite direction: it takes source code (JSX) and produces Figma. The two
are complementary — many community projects will want both.

A planned Phase 9+ enhancement is automatic Code Connect map generation:
for every Screen in the bundle, emit a `.figma.tsx` file that maps the
Figma node back to the JSX file.
