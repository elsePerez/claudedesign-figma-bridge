/**
 * @cdf/core
 *
 * Deterministic core of the ClaudeDesign ↔ Figma bridge.
 *
 * Phase 1: jsx-parser    — extract Artboards + normalize Screen trees
 * Phase 2: token-resolver — load CSS/Swift/JSX tokens, reconcile, emit drifts
 * Phase 3+: intent-builder, tree-diff, snapshot — coming next.
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

export {
  loadCssTokens,
  loadSwiftTokens,
  loadJsxTokens,
  reconcile,
  normalizeCssName,
  normalizeSwiftName,
  normalizeJsxKey,
  normalizeValue,
  inferCategory,
} from "./token-resolver/index.js";

export type {
  RawToken,
  TokenSource,
  TokenSourceKind,
  TokenMode,
  TokenDrift,
  TokenOrphan,
  DriftStatus,
  ReconcileOptions,
  ReconciliationResult,
} from "./token-resolver/index.js";

export {
  buildIntent,
  buildIntentFromBundle,
} from "./intent-builder/index.js";

export type {
  IntentArtboard,
  IntentNode,
  IntentValue,
  IntentDriftEntry,
  IntentOrphanEntry,
} from "./intent-builder/index.js";

export {
  loadSnapshot,
  saveSnapshot,
  recordBuild,
  recordVerify,
  recordPromotion,
} from "./snapshot/index.js";

export type {
  FigmaSnapshot,
  FigmaSnapshotEntry,
} from "./snapshot/index.js";

export { extractComponents, linkComponents } from "./linker/index.js";

export type { ComponentDef, LinkOptions } from "./linker/index.js";
