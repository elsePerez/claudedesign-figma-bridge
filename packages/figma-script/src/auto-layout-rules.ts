// Silent rules of Figma auto-layout, codified here so the emitter never
// violates them. RegExp.match() / String.match() are used below — no
// child_process anywhere in this file.

/**
 * The silent rules of Figma auto-layout — codified so we never violate them
 * by accident, the way a human (or LLM) inevitably does on a long script.
 *
 * Every rule here is one I personally broke during the vertical slice. The
 * symptoms range from "looks wrong" to "throws an error" to "silently
 * misaligned". The script emitter in emit-use-figma.ts implements all of
 * them — this file is the source of truth for the patterns.
 *
 * Reference: figma-use SKILL.md ("Critical Rules" section).
 */
export const AUTO_LAYOUT_RULES = {
  FILL_AFTER_APPEND: "layoutSizing{H,V} = 'FILL' must be set after parent.appendChild(child)",
  LOAD_FONT_PER_CALL: "Load all fonts at the start of every use_figma script",
  SWITCH_PAGE_ASYNC: "await figma.setCurrentPageAsync(page) at the start of every call",
  POSITION_AWAY_FROM_ZERO: "Set x/y on root-level frames so they don't overlap canvas content",
  COLOR_0_TO_1: "Color channels are 0..1 floats, not 0..255 integers",
  FILLS_READONLY: "Reassign node.fills = [...] instead of mutating the array",
  NO_NOTIFY: "Never call figma.notify() — use return for output",
  RESIZE_BEFORE_SIZING: "Call resize() before setting primary/counterAxisSizingMode",
  SVG_VIA_CREATE_NODE: "Use figma.createNodeFromSvg(svgString) for SVG inputs",
  EFFECT_REQUIRES_VISIBLE: "Effects need {visible: true, blendMode: 'NORMAL'}",
  PARENT_LAYOUT_BEFORE_CHILDREN: "Set parent.layoutMode before appending FILL children",
  TEXT_NEEDS_OWN_FONT: "Always set fontName + fontSize on createText()",
  RETURN_IDS: "Every script must return {createdNodeIds: [...]} at the end",
} as const;

/**
 * Generates a Figma color object literal from a CSS-like hex/rgba string.
 * Output: TypeScript expression string ready to embed in generated scripts.
 */
export function colorExpr(value: string): string {
  const hex = value.trim();
  const hexMatch = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const h = hexMatch[1]!;
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return `{ r: ${r.toFixed(4)}, g: ${g.toFixed(4)}, b: ${b.toFixed(4)} }`;
  }
  const rgbaMatch = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!, 10) / 255;
    const g = parseInt(rgbaMatch[2]!, 10) / 255;
    const b = parseInt(rgbaMatch[3]!, 10) / 255;
    return `{ r: ${r.toFixed(4)}, g: ${g.toFixed(4)}, b: ${b.toFixed(4)} }`;
  }
  return `{ r: 0, g: 0, b: 0 }`;
}

/**
 * Extract alpha (0..1) from an rgba string, or return 1 for opaque values.
 */
export function alphaOf(value: string): number {
  const rgbaMatch = value.trim().match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) return parseFloat(rgbaMatch[1]!);
  return 1;
}

/**
 * Parse a CSS `padding` shorthand into top/right/bottom/left.
 */
export function parsePadding(value: string): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const parts = value
    .split(/\s+/)
    .map(p => parseFloat(p.replace(/px$/i, "")))
    .map(n => (Number.isFinite(n) ? n : 0));
  const [a = 0, b = a, c = a, d = b] = parts;
  return { top: a, right: b, bottom: c, left: d };
}
