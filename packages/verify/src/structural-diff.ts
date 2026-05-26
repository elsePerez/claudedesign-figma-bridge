import type { IntentArtboard, IntentNode } from "@cdf/core";

export interface FigmaNodeSnapshot {
  /** Figma id (e.g. "6505:2") — optional, for traceability */
  id?: string;
  /** Figma type label (e.g. "FRAME", "TEXT") */
  type: string;
  /** Figma node name */
  name: string;
  /** Children */
  children?: FigmaNodeSnapshot[];
}

export interface StructuralDiffEntry {
  path: string;
  kind:
    | "missing-in-figma"
    | "extra-in-figma"
    | "type-mismatch"
    | "name-mismatch"
    | "ok";
  expected?: string;
  actual?: string;
}

export interface StructuralDiffResult {
  entries: StructuralDiffEntry[];
  errorCount: number;
}

/**
 * Compare an IntentArtboard's expected structure to the actual Figma node
 * tree obtained via `mcp__plugin_figma_figma__get_metadata`. Drift surfaces
 * as a flat list of per-path differences.
 *
 * "Path" is the dotted IntentNode tag chain (e.g. "Phone.div.SuggestionLine").
 *
 * Only "element" intent nodes are compared — text and expression nodes are
 * skipped because Figma flattens them into Frame/Text leaves the same way.
 */
export function diffStructure(
  intent: IntentArtboard,
  figmaRoot: FigmaNodeSnapshot,
): StructuralDiffResult {
  const entries: StructuralDiffEntry[] = [];
  walk(intent.root, figmaRoot, intent.root.tag, entries);

  return {
    entries,
    errorCount: entries.filter(e => e.kind !== "ok").length,
  };
}

function walk(
  intent: IntentNode,
  figma: FigmaNodeSnapshot | undefined,
  path: string,
  out: StructuralDiffEntry[],
): void {
  if (!figma) {
    out.push({ path, kind: "missing-in-figma", expected: intent.tag });
    return;
  }

  const expectedType = intent.type === "text" ? "TEXT" : "FRAME";
  const actualType = figma.type.toUpperCase();

  if (actualType !== expectedType && actualType !== "RECTANGLE" && actualType !== "GROUP") {
    out.push({ path, kind: "type-mismatch", expected: expectedType, actual: actualType });
  }

  if (intent.tag && figma.name && figma.name !== intent.tag) {
    // soft mismatch — names differ but type is OK
    out.push({
      path,
      kind: "name-mismatch",
      expected: intent.tag,
      actual: figma.name,
    });
  } else if (figma.name === intent.tag) {
    out.push({ path, kind: "ok", expected: intent.tag, actual: figma.name });
  }

  const intentChildren = intent.children.filter(c => c.type === "element");
  const figmaChildren = figma.children ?? [];

  const max = Math.max(intentChildren.length, figmaChildren.length);
  for (let i = 0; i < max; i++) {
    const ic = intentChildren[i];
    const fc = figmaChildren[i];
    if (ic && !fc) {
      out.push({ path: `${path}>${ic.tag}[${i}]`, kind: "missing-in-figma", expected: ic.tag });
      continue;
    }
    if (!ic && fc) {
      out.push({ path: `${path}>?[${i}]`, kind: "extra-in-figma", actual: fc.name });
      continue;
    }
    if (ic && fc) walk(ic, fc, `${path}>${ic.tag}[${i}]`, out);
  }
}
