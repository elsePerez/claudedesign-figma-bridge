/**
 * @cdf/core
 *
 * Deterministic core of the ClaudeDesign ↔ Figma bridge.
 *
 * Modules (planned, populated in subsequent phases):
 *   - jsx-parser      : Babel AST → canonical Artboard tree
 *   - token-resolver  : CSS + Swift + JSX cross-reference, emit drift report
 *   - intent-builder  : Artboard tree + token map → intent.json
 *   - tree-diff       : intent.json vs Figma node tree comparison
 *   - snapshot        : .figma-snapshot.json (screen → page/node mapping)
 *
 * Nothing exported yet — Phase 0 scaffold only.
 */

export const VERSION = "0.0.0";
