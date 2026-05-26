/**
 * Normalized JSX representation used across the bridge.
 * Independent of Babel's AST so downstream code doesn't depend on the parser.
 */

export type JsxPropValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" }
  | { kind: "object"; value: Record<string, JsxPropValue> }
  | { kind: "array"; value: JsxPropValue[] }
  /** Dynamic value we couldn't statically resolve. Holds the source for inspection. */
  | { kind: "expression"; source: string };

export interface JsxLoc {
  line: number;
  column: number;
}

export interface JsxNode {
  /** "element" for JSX elements, "text" for static text, "expression" for dynamic content */
  type: "element" | "text" | "expression";
  /** Tag name (e.g. "Phone", "div", "ScreenEmpty"). Empty for text/expression. */
  tag: string;
  /** True if the tag starts with an uppercase letter (React custom component) */
  isComponent: boolean;
  /** Resolved props (literal values inlined where possible) */
  props: Record<string, JsxPropValue>;
  /** Inline style object — normalized from style={{}} attribute. Empty if absent. */
  style: Record<string, JsxPropValue>;
  /** Children. Empty for self-closing or text/expression nodes. */
  children: JsxNode[];
  /** For type="text": the literal text value (whitespace-only nodes are filtered out). */
  text?: string;
  /** For type="expression": best-effort source representation. */
  expression?: string;
  /** Source location (1-indexed) — useful for debugging and drift reports. */
  loc?: JsxLoc;
}

export interface Artboard {
  /** label="..." prop on the <Artboard> JSXElement */
  label: string;
  /** Name of the Screen* component instantiated inside (e.g. "ScreenEmpty"). Empty if not found. */
  screenName: string;
  /** w prop on the Artboard wrapper (default 402 per Lista's Artboard definition) */
  width: number;
  /** h prop on the Artboard wrapper (default 874) */
  height: number;
  /** Which wrapper tag was matched ("Artboard", "DCArtboard", etc) */
  wrapperTag: string;
  /** Source location of the <Artboard> opening tag */
  loc?: JsxLoc;
}

export interface BundleParseResult {
  /** Absolute path that was parsed */
  filePath: string;
  /** All Artboards found in the JSX */
  artboards: Artboard[];
  /** Soft warnings (e.g. expressions we couldn't statically resolve) */
  warnings: string[];
}

export interface ExtractOptions {
  /**
   * JSX tag names that should be treated as Artboard wrappers.
   * Lista uses "Artboard". Editor uses "DCArtboard" (from design-canvas.jsx).
   * Default: ["Artboard", "DCArtboard"]
   */
  wrapperNames?: string[];
}
