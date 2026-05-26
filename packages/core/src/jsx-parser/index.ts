import { parseJsxFile } from "./parse-jsx-file.js";
import { extractArtboards } from "./extract-artboards.js";
import { normalizeScreenTree } from "./normalize-tree.js";
import type { BundleParseResult, ExtractOptions, JsxNode } from "./types.js";

export type {
  Artboard,
  BundleParseResult,
  ExtractOptions,
  JsxNode,
  JsxPropValue,
  JsxLoc,
} from "./types.js";

/**
 * Parse a ClaudeDesign JSX file and extract its Artboard list.
 *
 * Doesn't normalize the inner JSX trees — call `parseScreen()` for a specific
 * screen when you need its full normalized tree.
 */
export function parseBundleFile(
  filePath: string,
  options: ExtractOptions = {},
): BundleParseResult {
  const ast = parseJsxFile(filePath);
  return {
    filePath,
    artboards: extractArtboards(ast, options),
    warnings: [],
  };
}

/**
 * Parse a ClaudeDesign JSX file and return the normalized JsxNode tree for a
 * specific Screen component (e.g. "ScreenEmpty").
 */
export function parseScreen(filePath: string, screenName: string): JsxNode | null {
  const ast = parseJsxFile(filePath);
  return normalizeScreenTree(ast, screenName);
}
