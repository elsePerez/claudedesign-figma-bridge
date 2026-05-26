/**
 * @cdf/core
 *
 * Deterministic core of the ClaudeDesign ↔ Figma bridge.
 *
 * Phase 1: jsx-parser (this PR) — extract Artboards + normalize Screen trees.
 * Future phases populate token-resolver, intent-builder, tree-diff, snapshot.
 */

export const VERSION = "0.0.0";

export {
  parseBundleFile,
  parseScreen,
} from "./jsx-parser/index.js";

export type {
  Artboard,
  BundleParseResult,
  ExtractOptions,
  JsxNode,
  JsxPropValue,
  JsxLoc,
} from "./jsx-parser/index.js";
