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
  // linear-gradient(...): Figma's gradient API needs more machinery (transform
  // matrix, stops). For v1 we fall back to the *first* color stop and emit
  // that as a solid fill. Visual diff will flag it as drift; the user can
  // promote to a proper gradient later.
  if (/^linear-gradient\(/i.test(hex)) {
    const firstHex = hex.match(/#([0-9a-fA-F]{6})\b/);
    if (firstHex) return colorExpr(`#${firstHex[1]}`);
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

/**
 * Parse `border: 'Npx <style> #hex'` (CSS shorthand) into width + paint expr.
 * Returns null if the value doesn't look like a border shorthand.
 */
export function parseBorder(value: string): { width: number; colorExpr: string; opacity: number } | null {
  const v = value.trim();
  // Width
  const widthMatch = v.match(/^([\d.]+)px\b/);
  if (!widthMatch) return null;
  const width = parseFloat(widthMatch[1]!);
  // Color (hex or rgba)
  const hexMatch = v.match(/#[0-9a-fA-F]{3,8}\b/);
  const rgbaMatch = v.match(/rgba?\([^)]+\)/i);
  let colorStr: string | null = null;
  if (rgbaMatch) colorStr = rgbaMatch[0];
  else if (hexMatch) colorStr = hexMatch[0];
  if (!colorStr) return null;
  return { width, colorExpr: colorExpr(colorStr), opacity: alphaOf(colorStr) };
}

/**
 * Parse `boxShadow: 'X Y BLUR [SPREAD] COLOR'` into a Figma effect entry.
 * Supports a single shadow only — multiple shadows separated by commas
 * are returned as an array.
 *
 * Returns an array of effect entries that can be assigned to `node.effects`.
 */
export function parseBoxShadow(value: string): Array<{
  type: "DROP_SHADOW";
  offsetX: number;
  offsetY: number;
  radius: number;
  spread: number;
  colorExpr: string;
  alpha: number;
}> {
  const out: ReturnType<typeof parseBoxShadow> = [];
  // Split on commas that aren't inside parens (rgba contains commas)
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  for (const p of parts) {
    const colorMatch = p.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}\b/);
    if (!colorMatch) continue;
    const colorStr = colorMatch[0];
    const numericPart = p.replace(colorStr, "").trim();
    const nums = numericPart.split(/\s+/).map(n => parseFloat(n.replace(/px$/i, "")));
    if (nums.length < 3) continue;
    const [x = 0, y = 0, blur = 0, spread = 0] = nums;
    out.push({
      type: "DROP_SHADOW",
      offsetX: x,
      offsetY: y,
      radius: blur,
      spread,
      colorExpr: colorExpr(colorStr),
      alpha: alphaOf(colorStr),
    });
  }
  return out;
}

/**
 * Strip leading/trailing whitespace and collapse internal whitespace runs.
 * JSX text nodes preserve source whitespace, which renders as ugly newlines
 * inside text elements in Figma. This normalizes them like HTML does.
 */
export function normalizeJsxText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
