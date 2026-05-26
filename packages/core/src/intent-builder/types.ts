/**
 * IntentArtboard: the canonical JSON representation of a Figma-bound screen.
 *
 * Produced by combining a JsxNode tree (jsx-parser) with a token
 * ReconciliationResult (token-resolver). Consumed by the figma-script
 * renderer to emit a deterministic use_figma script, and by tree-diff to
 * compare against a Figma node tree.
 */

export interface IntentArtboard {
  schemaVersion: 1;
  label: string;
  screenName: string;
  size: { width: number; height: number };
  root: IntentNode;
  /** Drifts surfaced from token reconciliation (informational, not blocking). */
  drifts: IntentDriftEntry[];
  /** Color literals that didn't match any Swift token. */
  orphans: IntentOrphanEntry[];
}

export interface IntentNode {
  type: "element" | "text" | "expression";
  tag: string;
  isComponent: boolean;
  props: Record<string, IntentValue>;
  style: Record<string, IntentValue>;
  children: IntentNode[];
  text?: string;
}

export type IntentValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" }
  | {
      /** Color literal with optional Swift binding + JSX provenance. */
      kind: "color";
      literal: string;
      jsxRef?: string;
      swiftBinding?: string;
      isOrphan?: boolean;
    }
  | { kind: "expression"; source: string }
  | { kind: "object"; value: Record<string, IntentValue> }
  | { kind: "array"; value: IntentValue[] };

export interface IntentDriftEntry {
  semanticName: string;
  status: string;
  swiftValue?: string;
  cssValue?: string;
  jsxValue?: string;
  note: string;
}

export interface IntentOrphanEntry {
  value: string;
  sourceKey: string;
}
