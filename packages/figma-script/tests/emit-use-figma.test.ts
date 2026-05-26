// Tests for the figma-script emitter. Uses RegExp.test() / String.match()
// only — no child_process invocation anywhere.
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIntentFromBundle } from "@cdf/core";
import { emitUseFigma, colorExpr, alphaOf, parsePadding } from "../src/index.js";

const FX = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../core/tests/fixtures",
);

function screenEmptyIntent() {
  // link: false preserves Phone as a named component frame so the
  // pre-linker assertions still hold. Separate tests below exercise the
  // linked path.
  return buildIntentFromBundle({
    jsxPath: path.join(FX, "lista-screen.jsx"),
    cssPath: path.join(FX, "bundle-colors-and-type.css"),
    swiftColorsetsDir: path.join(FX, "swift-colorsets"),
    screenName: "ScreenEmpty",
    label: "01 · Lista vazia (Padrão B)",
    link: false,
  });
}

describe("auto-layout-rules helpers", () => {
  it("colorExpr converts hex to 0..1 channels", () => {
    expect(colorExpr("#F54844")).toContain("r: 0.96");
    expect(colorExpr("#FFFFFF")).toBe("{ r: 1.0000, g: 1.0000, b: 1.0000 }");
    expect(colorExpr("#000000")).toBe("{ r: 0.0000, g: 0.0000, b: 0.0000 }");
  });

  it("alphaOf extracts alpha from rgba", () => {
    expect(alphaOf("rgba(33,33,33,.06)")).toBe(0.06);
    expect(alphaOf("rgba(245,72,68,0.12)")).toBe(0.12);
    expect(alphaOf("#FFFFFF")).toBe(1);
  });

  it("parsePadding handles 1/2/3/4-value shorthands", () => {
    expect(parsePadding("12px")).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(parsePadding("8px 16px")).toEqual({ top: 8, right: 16, bottom: 8, left: 16 });
    expect(parsePadding("8px 16px 12px")).toEqual({ top: 8, right: 16, bottom: 12, left: 16 });
    expect(parsePadding("4px 16px 0 16px")).toEqual({ top: 4, right: 16, bottom: 0, left: 16 });
  });
});

describe("emitUseFigma · ScreenEmpty", () => {
  const intent = screenEmptyIntent();
  const script = emitUseFigma(intent, { pageId: "6504:2" });

  it("starts with a page switch", () => {
    expect(script).toContain("await figma.setCurrentPageAsync(__page)");
    expect(script.includes(`"6504:2"`)).toBe(true);
  });

  it("loads fonts before any text node is created", () => {
    const lines = script.split("\n");
    const firstFontLine = lines.findIndex(l => l.includes("loadFontAsync"));
    const firstTextLine = lines.findIndex(l => l.includes("createText("));
    expect(firstFontLine).toBeGreaterThanOrEqual(0);
    if (firstTextLine >= 0) {
      expect(firstFontLine).toBeLessThan(firstTextLine);
    }
  });

  it("loads all 5 default font weights", () => {
    for (const w of ["Regular", "Medium", "SemiBold", "Bold", "ExtraBold"]) {
      expect(script.includes(`style: "${w}"`)).toBe(true);
    }
  });

  it("ends with a return statement carrying createdNodeIds", () => {
    expect(script.trim().endsWith("return { createdNodeIds: __ids };")).toBe(true);
  });

  it("appendChild precedes every layoutSizing FILL assignment", () => {
    const lines = script.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      const m = line.match(/^(\w+)\.layoutSizing(Horizontal|Vertical) = "FILL";$/);
      if (!m) continue;
      const child = m[1]!;
      const appendNeedle = ".appendChild(" + child + ")";
      const appendIdx = lines.slice(0, i).findIndex(l => l.includes(appendNeedle));
      expect(appendIdx, "FILL set on " + child + " before its appendChild").toBeGreaterThanOrEqual(0);
    }
  });

  it("references the Phone root tag and uses createFrame", () => {
    expect(script.includes(`"Phone"`)).toBe(true);
    expect(script.includes("figma.createFrame()")).toBe(true);
  });

  it("never calls figma.notify (forbidden in use_figma)", () => {
    expect(script.includes("figma.notify")).toBe(false);
  });

  it("positions the root frame away from (0,0)", () => {
    expect(script).toMatch(/\.x = \d+;/);
    expect(script).toMatch(/\.y = \d+;/);
  });
});
