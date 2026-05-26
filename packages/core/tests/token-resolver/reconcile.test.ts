import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCssTokens,
  loadJsxTokens,
  loadSwiftTokens,
  reconcile,
} from "../../src/token-resolver/index.js";

const FX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("reconcile · vertical-slice drift reproduction", () => {
  const swift = loadSwiftTokens(path.join(FX, "swift-colorsets"));
  const css = loadCssTokens(path.join(FX, "bundle-colors-and-type.css"));
  const jsx = loadJsxTokens(path.join(FX, "lista-screen.jsx"));

  const result = reconcile([swift, css, jsx], { category: "color", mode: "any-or-light" });

  it("background: JSX drift (#FAFAFA vs Swift #FFFFFF)", () => {
    const d = result.drifts.find(d => d.semanticName === "background");
    expect(d).toBeDefined();
    expect(d!.status).toBe("drift-jsx");
    expect(d!.swiftValue).toBe("#FFFFFF");
    expect(d!.cssValue).toBe("#FFFFFF");
    expect(d!.jsxValue).toBe("#FAFAFA");
  });

  it("surface: JSX drift (#FFFFFF vs Swift #F5F5F5)", () => {
    const d = result.drifts.find(d => d.semanticName === "surface");
    expect(d!.status).toBe("drift-jsx");
    expect(d!.swiftValue).toBe("#F5F5F5");
    expect(d!.jsxValue).toBe("#FFFFFF");
  });

  it("surfaceVariant: JSX drift (#F5F5F5 vs Swift #EEEEEE)", () => {
    const d = result.drifts.find(d => d.semanticName === "surfaceVariant");
    expect(d!.status).toBe("drift-jsx");
    expect(d!.swiftValue).toBe("#EEEEEE");
    expect(d!.jsxValue).toBe("#F5F5F5");
  });

  it("outlineVariant: JSX drift (rgba shortcut vs Swift #BDBDBD)", () => {
    const d = result.drifts.find(d => d.semanticName === "outlineVariant");
    expect(d!.status).toBe("drift-jsx");
    expect(d!.swiftValue).toBe("#BDBDBD");
    expect(d!.jsxValue).toBe("rgba(33,33,33,.06)");
  });

  it("primaryContainer: JSX drift (alpha shortcut vs Swift #FCECEA)", () => {
    const d = result.drifts.find(d => d.semanticName === "primaryContainer");
    expect(d!.status).toBe("drift-jsx");
    expect(d!.swiftValue).toBe("#FCECEA");
    expect(d!.jsxValue).toBe("rgba(245,72,68,.12)");
  });

  it("warningContainer: JSX drift (alpha shortcut vs Swift #FFF3E0)", () => {
    const d = result.drifts.find(d => d.semanticName === "warningContainer");
    expect(d!.status).toBe("drift-jsx");
    expect(d!.swiftValue).toBe("#FFF3E0");
    expect(d!.jsxValue).toBe("rgba(255,152,0,.12)");
  });

  it("primary: aligned across all three sources", () => {
    const d = result.drifts.find(d => d.semanticName === "primary");
    expect(d!.status).toBe("aligned");
    expect(d!.swiftValue).toBe("#F54844");
    expect(d!.cssValue).toBe("#F54844");
    expect(d!.jsxValue).toBe("#F54844");
  });

  it("onSurface, onSurfaceVariant, outline, warning, success — all aligned", () => {
    for (const name of ["onSurface", "onSurfaceVariant", "outline", "warning", "success"]) {
      const d = result.drifts.find(d => d.semanticName === name);
      expect(d, `${name} should have a drift entry`).toBeDefined();
      expect(d!.status).toBe("aligned");
    }
  });

  it("counts at least 6 JSX drifts in color category", () => {
    const drifts = result.drifts.filter(d => d.status === "drift-jsx");
    expect(drifts.length).toBeGreaterThanOrEqual(6);
  });

  it("flags JSX alpha-shortcut values as orphans (no Swift exact match)", () => {
    const orphanValues = result.orphans.map(o => o.value);
    expect(orphanValues).toContain("rgba(33,33,33,.06)");
    expect(orphanValues).toContain("rgba(245,72,68,.12)");
    expect(orphanValues).toContain("rgba(255,152,0,.12)");
  });
});

describe("reconcile · edge cases", () => {
  it("returns empty result for no sources", () => {
    const r = reconcile([]);
    expect(Object.keys(r.map)).toHaveLength(0);
    expect(r.drifts).toHaveLength(0);
    expect(r.orphans).toHaveLength(0);
  });

  it("Swift-only source yields 'missing-css' + 'missing-jsx' drifts", () => {
    const swift = loadSwiftTokens(path.join(FX, "swift-colorsets"));
    const r = reconcile([swift], { category: "color" });
    const d = r.drifts.find(d => d.semanticName === "primary");
    expect(d).toBeDefined();
    // primary appears twice in Swift (light + dark fallback). With no CSS/JSX:
    expect(["missing-css", "missing-jsx"]).toContain(d!.status);
  });
});
