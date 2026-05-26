---
description: Build a single screen from the ClaudeDesign bundle into the Figma staging page.
argument-hint: <ScreenName>
---

You are running the **ClaudeDesign → Figma bridge** in SCREEN mode.

Most-used command. Use it for the 90% case: iterate on one screen at a time
and validate the result visually before moving on.

## Required argument

`$1` = Screen component name (e.g., `ScreenEmpty`, `ScreenWithItems`, `ScreenAutoClear3`).

If `$1` is empty:
- Run `pnpm tsx packages/cli/src/bin.ts parse <jsxPath> --format json | jq '.artboards[].screenName'`
- Show the user the available screen names via AskUserQuestion (up to 4 options + "Other")
- Use the selection as `$1`.

## Workflow

1. **Read config** — same as `/cdf-clone`. If `cdf.config.json` missing → STOP and explain.

2. **Plan** — produce the IntentArtboard JSON:
   ```
   pnpm tsx packages/cli/src/bin.ts plan \
     --jsx <bundle.jsxFile> \
     --css <tokens.css> \
     --swift <tokens.swiftColorsets> \
     --screen $1 \
     --label "$1" \
     --out /tmp/cdf-intent-$1.json
   ```

3. **Emit** — produce the `use_figma` script:
   ```
   pnpm tsx packages/cli/src/bin.ts emit \
     --intent /tmp/cdf-intent-$1.json \
     --page <figma.stagingPageId> \
     --origin-x 100 --origin-y 100 \
     --out /tmp/cdf-script-$1.js
   ```

4. **Pre-flight checks**
   - Check the script size. If > 48000 bytes, warn the user — close to `use_figma`'s 50KB cap.
   - Read the script content into memory.

5. **Clean prior copy** (optional but recommended)
   - If `.figma-snapshot.json` has a previous entry for `$1` in `_staging`, run a small `use_figma` call to delete that node by id BEFORE writing the new one. Use `figma.getNodeByIdAsync(<id>)` + `node.remove()`.

6. **Execute**
   - Call `mcp__plugin_figma_figma__use_figma` with:
     - `code`: the full content of `/tmp/cdf-script-$1.js`
     - `fileKey`: `figma.fileKey` from config
     - `description`: "Build $1 into _staging"
     - `skillNames`: "figma-use"
   - Capture the returned `{ createdNodeIds: [...] }`. The root is typically the first id.

7. **Screenshot**
   - `mcp__plugin_figma_figma__get_screenshot` with the root node id.
   - Save the PNG locally if `docs/plans/figma-bridge-snapshots/` exists, with filename `<screenName>-<timestamp>.png`.

8. **Compare against Playwright reference** (if HTML preview exists)
   - If `bundle.htmlFile` is configured, render the HTML via the playwright-renderer:
     ```
     pnpm tsx packages/cli/src/bin.ts render \
       --bundle <bundlePath> --html <htmlFile> \
       --label "<label-from-intent>" \
       --out /tmp/cdf-reference-$1.png
     ```
   - This requires Playwright + Chromium installed. If it fails (browser missing), skip with a notice.

9. **Update snapshot**
   - Append to `.figma-snapshot.json` via `recordBuild`: `status: "staging"`, current timestamp, the root node id.

10. **Report**
    - Figma node id of the new root.
    - Screenshot path (or URL if not saved locally).
    - Drift summary: how many JSX-vs-Swift token drifts and orphans (from the intent's `drifts` and `orphans` arrays).
    - Next-step suggestion: "Run `/cdf-review $1` to verify, or `/cdf-promote $1` when satisfied (when promote command is built)."

## Speed expectation

- Bridge run: ~5–15s end to end depending on screen complexity.
- Figma render: ~2–3s.
- Playwright reference (if enabled): adds ~10–20s on first run (browser cold start).

## Error recovery

If `use_figma` errors mid-execution, the call is atomic — no partial nodes
land. Read the error, fix the bridge (or the bundle), and re-run the same
command. The snapshot is only updated on success.
