---
description: Review built screens — visual + structural diff against the bundle. READ-ONLY, no Figma writes.
argument-hint: [ScreenName | --all]
---

You are running the **ClaudeDesign → Figma bridge** in REVIEW mode.

This command is **strictly read-only**. It never writes to Figma. Use it for
audit, gate-keeping before release, or sanity-checking that the Figma file
still reflects the current bundle.

## Mode selection

- **`/cdf-review ScreenEmpty`** — review one screen by name.
- **`/cdf-review --all`** — review every screen recorded in `.figma-snapshot.json`.
- **`/cdf-review`** (no arg) — same as `--all`.

## Workflow

1. **Read config + snapshot**
   - `cat cdf.config.json` for paths and `figma.fileKey`.
   - `cat <config.snapshot>` for the list of tracked screens with their Figma node ids.
   - If the snapshot is empty or missing: tell the user "No tracked screens. Run `/cdf-clone` or `/cdf-screen` first." STOP.

2. **Resolve the screen list**
   - If `$1` is a screen name: filter snapshot to that entry.
   - Otherwise: use all entries.

3. **For each screen, in order:**

   a. **Fetch Figma metadata** (no writes)
      - `mcp__plugin_figma_figma__get_metadata` with `fileKey`, `nodeId` (from snapshot's `rootNodeId`).
      - Parse the returned XML/JSON into a `FigmaNodeSnapshot` tree.

   b. **Build expected intent** (no writes)
      - `pnpm tsx packages/cli/src/bin.ts plan --jsx ... --screen <name> --label "<label>" --css ... --swift ... --out /tmp/cdf-intent-<name>.json`

   c. **Structural diff**
      - Load both: the intent's `root` (`IntentNode`) and the Figma snapshot's tree.
      - Use `@cdf/verify`'s `diffStructure(intent, figmaSnapshot)` — call via a small node one-liner if no CLI command exposes it yet:
        ```bash
        node -e '
          const { diffStructure } = require("./packages/verify/dist/index.js");
          const intent = require("/tmp/cdf-intent-<name>.json");
          const figma = require("/tmp/cdf-figma-meta-<name>.json");
          console.log(JSON.stringify(diffStructure(intent, figma), null, 2));
        '
        ```
      - Count `errorCount` (entries where kind !== "ok").

   d. **Visual diff** (if Playwright reference exists)
      - Look for `docs/plans/figma-bridge-snapshots/<name>-playwright.png` OR run `cdf render` if `bundle.htmlFile` is configured.
      - Take a fresh Figma screenshot via `mcp__plugin_figma_figma__get_screenshot` of the snapshot's `rootNodeId`.
      - Compare: `diffImages({ referencePath, candidatePath, maxRatio: 0.01 })` from `@cdf/verify`.
      - If pixel-diff exceeds the threshold, save the diff PNG to `/tmp/cdf-diff-<name>.png`.

   e. **Token drift** (from intent)
      - Read the `drifts` array in `/tmp/cdf-intent-<name>.json` and count entries with `status === "drift-jsx"`.
      - Read `orphans` for color literals not matching any Swift token.

   f. **Score this screen**
      - `PASS` — structural errorCount = 0 AND visual ratio < 0.01 AND no new orphans.
      - `DRIFT` — structural errorCount 1–3 OR visual ratio 0.01–0.05 OR token drifts.
      - `BROKEN` — structural errorCount > 3 OR visual ratio > 0.05.

4. **Report — table format**

   ```
   Screen                     Status    Struct    Pixel%    Tokens
   ─────────────────────────────────────────────────────────────────
   ScreenEmpty                ✅ PASS    0/47      0.3%      0
   ScreenWithItems            ⚠️  DRIFT  2/63      1.8%      3
   ScreenAutoClear6           ❌ BROKEN  12/89     8.4%      0
   ```

5. **Suggested next steps**
   - For each DRIFT/BROKEN, point to the diff PNG (if generated) and recommend `/cdf-screen <Name>` to re-sync.
   - For all PASS: suggest the user can safely consider promoting (`/cdf-promote --all` when built).

## Never do

- **Don't modify the Figma file.** Not even to clean up. This command is observation only.
- **Don't update `.figma-snapshot.json`.** Verify outcomes go into a separate report or are reported verbally — they're a transient quality check, not lifecycle state.
- **Don't auto-correct.** If you spot drift, the user is the one who decides what to do.

## When to use

- Before a release: `--all` to confirm the whole DS file is in sync.
- After someone edited the Figma manually: confirm what drifted.
- Periodic audit: weekly run to catch silent drift.

## Reading the output

- `Struct N/M` — N mismatches out of M elements. The intent is the source-of-truth structure; the Figma is the candidate.
- `Pixel%` — fraction of pixels that differ between Figma screenshot and the HTML reference.
- `Tokens` — count of JSX token values that don't match the Swift canonical value (informational; not failure).
