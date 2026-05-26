#!/usr/bin/env node
/**
 * `cdf` — ClaudeDesign ↔ Figma bridge CLI.
 *
 * Commands:
 *   parse   list Artboards or dump a Screen tree
 *   tokens  cross-reference CSS/Swift/JSX tokens + emit drift table
 *   plan    build an IntentArtboard JSON for one screen
 *   emit    convert an intent JSON to a use_figma JavaScript script
 *   render  Playwright-screenshot an Artboard from the HTML preview
 */
import { Command } from "commander";
import * as fs from "node:fs";
import {
  runParse,
  runTokens,
  runPlan,
  runEmit,
  runRender,
} from "./index.js";

const program = new Command();

program
  .name("cdf")
  .description("ClaudeDesign ↔ Figma bridge")
  .version("0.0.0");

program
  .command("parse")
  .description("List Artboards in a JSX bundle, or dump a specific Screen tree")
  .argument("<jsxPath>", "Path to the *.jsx file from the ClaudeDesign bundle")
  .option("-s, --screen <name>", "If given, output the normalized tree for this Screen")
  .option("-f, --format <fmt>", "Output format: json | table", "table")
  .action((jsxPath: string, opts) => {
    const out = runParse({ jsxPath, screen: opts.screen, format: opts.format });
    process.stdout.write(out + "\n");
  });

program
  .command("tokens")
  .description("Cross-reference CSS, Swift colorsets, and the JSX T object → drift report")
  .option("-j, --jsx <path>", "JSX file containing the T token object")
  .option("-c, --css <path>", "colors_and_type.css path")
  .option("-s, --swift <dir>", "Directory containing *.colorset/Contents.json")
  .option("-f, --format <fmt>", "Output format: json | table", "table")
  .action(opts => {
    const out = runTokens({
      jsxPath: opts.jsx,
      cssPath: opts.css,
      swiftDir: opts.swift,
      format: opts.format,
    });
    process.stdout.write(out + "\n");
  });

program
  .command("plan")
  .description("Build the IntentArtboard JSON for one screen")
  .requiredOption("-j, --jsx <path>", "JSX file")
  .requiredOption("-s, --screen <name>", "Screen component name (e.g. ScreenEmpty)")
  .option("-l, --label <text>", "Artboard label override")
  .option("-c, --css <path>", "CSS tokens file (for binding)")
  .option("--swift <dir>", "Swift colorsets dir (for binding)")
  .option("-o, --out <path>", "Write to file instead of stdout")
  .action(opts => {
    const out = runPlan({
      jsxPath: opts.jsx,
      screen: opts.screen,
      label: opts.label,
      cssPath: opts.css,
      swiftDir: opts.swift,
    });
    if (opts.out) fs.writeFileSync(opts.out, out + "\n", "utf-8");
    else process.stdout.write(out + "\n");
  });

program
  .command("emit")
  .description("Convert an intent JSON to a use_figma JavaScript script")
  .requiredOption("-i, --intent <path>", "Intent JSON path (from `cdf plan`)")
  .requiredOption("-p, --page <id>", "Target Figma page node id (e.g. 6504:2 for _staging)")
  .option("--origin-x <n>", "Root x offset (default 100)", v => parseInt(v, 10))
  .option("--origin-y <n>", "Root y offset (default 100)", v => parseInt(v, 10))
  .option("-o, --out <path>", "Write to file instead of stdout")
  .action(opts => {
    const out = runEmit({
      intentPath: opts.intent,
      pageId: opts.page,
      originX: opts.originX,
      originY: opts.originY,
    });
    if (opts.out) fs.writeFileSync(opts.out, out + "\n", "utf-8");
    else process.stdout.write(out + "\n");
  });

program
  .command("render")
  .description("Playwright-render an Artboard from the HTML preview to a PNG")
  .requiredOption("-b, --bundle <dir>", "Bundle directory")
  .requiredOption("-h, --html <file>", "HTML file name within the bundle")
  .requiredOption("-l, --label <text>", "Artboard label to locate")
  .requiredOption("-o, --out <path>", "Output PNG path")
  .action(async opts => {
    const msg = await runRender({
      bundleDir: opts.bundle,
      htmlFile: opts.html,
      artboardLabel: opts.label,
      outputPath: opts.out,
    });
    process.stdout.write(msg + "\n");
  });

program.parseAsync().catch(err => {
  process.stderr.write(`cdf: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
