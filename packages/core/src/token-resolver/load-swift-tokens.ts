import * as fs from "node:fs";
import * as path from "node:path";
import { inferCategory, normalizeSwiftName, normalizeValue } from "./normalize-name.js";
import type { RawToken, TokenMode, TokenSource } from "./types.js";

/**
 * Load Swift design tokens from an `.xcassets`-style directory containing
 * `.colorset` subdirectories. Each colorset has a `Contents.json` with one
 * or more color entries (light/dark appearances).
 *
 * Input directory can be:
 *   - A flat dir containing `*.colorset/` (test fixtures use this layout)
 *   - A `.xcassets/` directory containing the colorsets
 */
export function loadSwiftTokens(dirPath: string): TokenSource {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const tokens: RawToken[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.endsWith(".colorset")) continue;

    const colorsetName = entry.name.replace(/\.colorset$/, "");
    const contentsPath = path.join(dirPath, entry.name, "Contents.json");
    if (!fs.existsSync(contentsPath)) continue;

    const raw = fs.readFileSync(contentsPath, "utf-8");
    let parsed: ColorsetContents;
    try {
      parsed = JSON.parse(raw) as ColorsetContents;
    } catch {
      continue;
    }

    for (const colorEntry of parsed.colors ?? []) {
      const mode = inferModeFromAppearances(colorEntry.appearances);
      const value = colorComponentsToValue(colorEntry.color?.components);
      if (!value) continue;
      const semanticName = normalizeSwiftName(colorsetName);
      tokens.push({
        sourceName: colorsetName,
        semanticName,
        value: normalizeValue(value),
        mode,
        category: inferCategory(semanticName, value),
      });
    }
  }

  return { source: "swift", filePath: dirPath, tokens };
}

interface ColorsetContents {
  colors?: ColorsetColor[];
}

interface ColorsetColor {
  appearances?: { appearance?: string; value?: string }[];
  color?: { components?: ColorComponents };
}

interface ColorComponents {
  red?: string | number;
  green?: string | number;
  blue?: string | number;
  alpha?: string | number;
}

function inferModeFromAppearances(appearances?: { value?: string }[]): TokenMode {
  if (!appearances || appearances.length === 0) return "any";
  const v = appearances[0]?.value;
  if (v === "dark") return "dark";
  return "any";
}

function colorComponentsToValue(c?: ColorComponents): string | null {
  if (!c) return null;
  const r = parseFloat(String(c.red ?? "0"));
  const g = parseFloat(String(c.green ?? "0"));
  const b = parseFloat(String(c.blue ?? "0"));
  const a = parseFloat(String(c.alpha ?? "1"));
  if (![r, g, b, a].every(n => Number.isFinite(n))) return null;
  if (a >= 0.999) return rgbToHex(r, g, b);
  // semi-transparent — emit as rgba()
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const ch = (n: number) => {
    const clamped = Math.max(0, Math.min(1, n));
    return Math.round(clamped * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  };
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}
