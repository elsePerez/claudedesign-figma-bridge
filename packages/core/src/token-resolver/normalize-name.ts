/**
 * Semantic name normalization across the three sources.
 *
 * Goal: any of `--stoqio-primary`, `stoqio.primary`, `bg` (JSX) reduces to the
 * same canonical key (`primary`, `background`) when they refer to the same
 * conceptual token.
 */

/**
 * JSX `T` object aliases — keys that don't trivially camelCase to the
 * canonical name. Everything not listed here passes through unchanged
 * (the JSX object already uses camelCase).
 */
export const JSX_ALIASES: Record<string, string> = {
  bg: "background",
};

/** `--stoqio-primary` → `primary`, `--on-surface-variant` → `onSurfaceVariant` */
export function normalizeCssName(prop: string): string {
  let n = prop.replace(/^--/, "");
  // strip leading "stoqio-" namespace
  n = n.replace(/^stoqio-/, "");
  // kebab → camel
  return n.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** `stoqio.background` → `background`, `stoqio.onSurfaceVariant` → `onSurfaceVariant` */
export function normalizeSwiftName(name: string): string {
  return name.replace(/^stoqio\./, "");
}

/** `bg` → `background`, `surfaceVariant` → `surfaceVariant` */
export function normalizeJsxKey(key: string): string {
  return JSX_ALIASES[key] ?? key;
}

/**
 * Normalize a value string for cross-source equality.
 * - Hex values: uppercase, expand 3-char to 6-char
 * - rgba/rgb: collapse whitespace
 * - Other: trim and collapse whitespace
 */
export function normalizeValue(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    // expand #abc → #aabbcc
    const r = v[1]!;
    const g = v[2]!;
    const b = v[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  // rgba / rgb / gradient — collapse internal whitespace
  return v.replace(/\s+/g, " ");
}

/**
 * Guess a category from the value. Colors win when value looks colorish;
 * px/rem values become spacing/radius (we can't tell those apart without name);
 * fs-* names hint typography.
 */
export function inferCategory(name: string, value: string): "color" | "spacing" | "radius" | "typography" | "other" {
  if (name.startsWith("fs") || name.startsWith("font") || /^['"]/.test(value)) return "typography";
  if (name.startsWith("radius")) return "radius";
  if (name.startsWith("space") || name.startsWith("spacing")) return "spacing";
  if (/^#[0-9a-fA-F]{3,6}$/.test(value)) return "color";
  if (/^rgba?\(/i.test(value)) return "color";
  if (/^linear-gradient/i.test(value)) return "color";
  return "other";
}
