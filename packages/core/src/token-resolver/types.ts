/**
 * Token model used across the bridge.
 *
 * Sources of truth:
 *   - Swift `.colorset/Contents.json` (canonical)
 *   - CSS bundle `colors_and_type.css` (should mirror Swift)
 *   - JSX `T = { ... }` object inside ClaudeDesign screen files
 *
 * Semantic names are normalized so a single key (`background`, `onSurface`,
 * `primary`, etc) maps across all three sources. The reconcile() function
 * flags drift between them.
 */

export type TokenMode = "light" | "dark" | "any";
export type TokenSourceKind = "css" | "swift" | "jsx";

export interface RawToken {
  /** Source-specific name (e.g. "--stoqio-primary", "stoqio.primary", "bg") */
  sourceName: string;
  /** Canonical name across all sources (e.g. "primary", "background", "onSurfaceVariant") */
  semanticName: string;
  /** Resolved value — uppercase hex `#RRGGBB`, `rgba(...)` string, or gradient string */
  value: string;
  /** Mode this value applies in. "any" means no appearance variant. */
  mode: TokenMode;
  /** Optional category hint — useful when reconciling only a slice (e.g. colors) */
  category?: "color" | "spacing" | "radius" | "typography" | "other";
}

export interface TokenSource {
  source: TokenSourceKind;
  filePath: string;
  tokens: RawToken[];
}

export type DriftStatus =
  /** All sources agree (and Swift is present) */
  | "aligned"
  /** Swift + CSS agree, JSX disagrees — most common case */
  | "drift-jsx"
  /** Swift and CSS disagree — system-level inconsistency */
  | "swift-css-mismatch"
  /** No Swift token for this semantic — JSX or CSS introduced an unknown */
  | "missing-swift"
  /** No CSS token for this semantic */
  | "missing-css"
  /** No JSX usage of this semantic — informational, not necessarily wrong */
  | "missing-jsx";

export interface TokenDrift {
  semanticName: string;
  swiftValue?: string;
  cssValue?: string;
  jsxValue?: string;
  status: DriftStatus;
  note: string;
}

export interface TokenOrphan {
  /** Hex/rgba literal found in JSX that doesn't match any known token */
  value: string;
  /** Which JSX `T.<key>` carried it (or "" if found inline outside T) */
  sourceKey: string;
}

export interface ReconciliationResult {
  /** Canonical map: semanticName → values per source (light mode only for v1) */
  map: Record<string, { swift?: string; css?: string; jsx?: string }>;
  /** All drifts, including aligned entries for completeness */
  drifts: TokenDrift[];
  /** JSX literals that don't correspond to any known token name */
  orphans: TokenOrphan[];
}

export interface ReconcileOptions {
  /**
   * Filter the result to a specific category. Useful for reports that only
   * care about colors and not spacing/typography.
   */
  category?: RawToken["category"];
  /**
   * Mode to compare. Defaults to "any-or-light" which means: prefer "any"
   * tokens (Swift) and "light" tokens (CSS dark blocks are ignored).
   */
  mode?: "any-or-light" | "dark";
}
