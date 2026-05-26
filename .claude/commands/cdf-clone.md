---
description: Clone every Artboard from a ClaudeDesign JSX bundle into the configured Figma staging page.
argument-hint: [override-jsx-path]
---

You are running the **ClaudeDesign → Figma bridge** in CLONE mode.

This command performs the full sync: every Artboard in the bundle's JSX file
gets built into the Figma `_staging` page. Use it when starting fresh or
after a major bundle revision.

## Required setup

The repo root MUST contain a `cdf.config.json` with at minimum:

- `bundle.jsxFile` — path to the JSX file (absolute or relative to repo)
- `tokens.css` — path to the bundle's `colors_and_type.css`
- `tokens.swiftColorsets` — path to a `.xcassets` dir (optional; can be null)
- `figma.fileKey` — Figma file key
- `figma.stagingPageId` — page node id (format `123:4`) — the bridge writes here

If the user passed an argument, treat it as an override for `bundle.jsxFile`.

## Workflow

1. **Read config**
   - `cat cdf.config.json` and parse it.
   - If missing, tell the user to copy `cdf.config.example.json` to `cdf.config.json` and fill it in. STOP.

2. **List Artboards**
   - Run: `pnpm tsx packages/cli/src/bin.ts parse <jsxPath> --format json | jq '.artboards'`
   - Show the user the list (label + screenName + size) and the total count.

3. **Confirm scope (mandatory before any writes)**
   - Ask with AskUserQuestion: "About to clone N artboards into the `_staging` page of `<fileKey>`. Proceed?"
   - Options: "Clone all", "Pick subset", "Cancel".
   - If "Pick subset": ask which screen names (comma-separated list).

4. **Clear `_staging` (optional)**
   - Ask: "Clear existing content in `_staging` first? (Recommended for fresh clone)"
   - If yes: emit a small `use_figma` call that removes all children of the staging page.

5. **For each selected Artboard, in order**:
   1. `pnpm tsx packages/cli/src/bin.ts plan --jsx <path> --css <css> --swift <swift> --screen <name> --label <label> --out /tmp/cdf-intent-<name>.json`
   2. `pnpm tsx packages/cli/src/bin.ts emit --intent /tmp/cdf-intent-<name>.json --page <stagingPageId> --origin-x <x> --origin-y 100 --out /tmp/cdf-script-<name>.js`
      - Layout x position: arrange in a horizontal row, 500px apart per artboard.
   3. Check the script size with `wc -c /tmp/cdf-script-<name>.js`. If above 48000, warn the user (close to the 50KB `use_figma` limit).
   4. Read the script content.
   5. Execute via `mcp__plugin_figma_figma__use_figma` with the script as the `code` parameter and `skillNames: "figma-use"`.
   6. Take a screenshot via `mcp__plugin_figma_figma__get_screenshot` of the returned root node id.
   7. Record progress: "✅ <screenName> (i/N) → node <id>".

6. **Record snapshot**
   - Update `.figma-snapshot.json` (path from `config.snapshot`) with a `recordBuild` entry per screen: `status: "staging"`, `pageId`, `rootNodeId`, current timestamp.

7. **Report**
   - Table: `screenName | label | nodeId | status | screenshot-url`
   - Any failures grouped at the bottom with the error message.

## Safety

- **Never** touch the canonical page (`figma.canonicalPageId`) — only `_staging`.
- If a screen already exists in `.figma-snapshot.json` with `status: "promoted"`, skip it with a warning UNLESS the user explicitly passes `--force-promoted`.
- Each `use_figma` invocation is atomic — a failed script doesn't partially write. If one fails, log it and continue with the rest.
- Don't auto-promote anything. Promotion is a separate command (future).

## When to use

- First-time setup of a new Figma file.
- After major refactor of a bundle (e.g., DS token revision).
- When you want a clean canvas state to QA from.

## When NOT to use

- For a single screen change → use `/cdf-screen <Name>` instead.
- For checking drift → use `/cdf-review` (no writes).
