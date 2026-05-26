import { parseScreen } from "../jsx-parser/index.js";
import {
  loadCssTokens,
  loadJsxTokens,
  loadSwiftTokens,
  reconcile,
} from "../token-resolver/index.js";
import type { TokenSource } from "../token-resolver/index.js";
import { extractComponents, linkComponents } from "../linker/index.js";
import { buildIntent } from "./build-intent.js";
import type { IntentArtboard } from "./types.js";

export interface BuildFromBundleOptions {
  jsxPath: string;
  screenName: string;
  label: string;
  size?: { width: number; height: number };
  cssPath?: string;
  swiftColorsetsDir?: string;
  /**
   * Inline custom-component references via the linker. Default true.
   * Disable for debugging the un-linked tree.
   */
  link?: boolean;
}

/**
 * One-shot convenience: parse the JSX, load tokens, reconcile, build intent.
 * Useful for the CLI and tests.
 */
export function buildIntentFromBundle(options: BuildFromBundleOptions): IntentArtboard {
  let jsxTree = parseScreen(options.jsxPath, options.screenName);
  if (!jsxTree) {
    throw new Error(`Screen "${options.screenName}" not found in ${options.jsxPath}`);
  }

  if (options.link !== false) {
    const components = extractComponents(options.jsxPath);
    jsxTree = linkComponents(jsxTree, components);
  }

  const sources: TokenSource[] = [];
  if (options.swiftColorsetsDir) sources.push(loadSwiftTokens(options.swiftColorsetsDir));
  if (options.cssPath) sources.push(loadCssTokens(options.cssPath));
  sources.push(loadJsxTokens(options.jsxPath));

  const reconciliation = reconcile(sources, { category: "color" });

  return buildIntent({
    label: options.label,
    screenName: options.screenName,
    size: options.size ?? { width: 402, height: 874 },
    jsxTree,
    reconciliation,
    sources,
  });
}
