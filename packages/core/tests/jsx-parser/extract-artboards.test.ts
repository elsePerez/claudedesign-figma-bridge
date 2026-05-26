import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBundleFile } from "../../src/jsx-parser/index.js";

const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

describe("extractArtboards · lista-screen.jsx", () => {
  const listaPath = path.join(FIXTURE_DIR, "lista-screen.jsx");

  it("finds 24 Artboards", () => {
    const result = parseBundleFile(listaPath);
    // Lista (Fase 2): 1 TabBar showcase + 5 main states + 3 add-item sheets
    // + 3 recurrence + 4 auto-clear + 4 historico + 4 refinements = 24
    expect(result.artboards).toHaveLength(24);
  });

  it("first ScreenEmpty Artboard has label '01 · Lista vazia (Padrão B)'", () => {
    const result = parseBundleFile(listaPath);
    const screenEmpty = result.artboards.find(a => a.screenName === "ScreenEmpty");
    expect(screenEmpty).toBeDefined();
    expect(screenEmpty!.label).toBe("01 · Lista vazia (Padrão B)");
    expect(screenEmpty!.width).toBe(402);
    expect(screenEmpty!.height).toBe(874);
    expect(screenEmpty!.wrapperTag).toBe("Artboard");
  });

  it("Tab Bar showcase Artboard has custom w=460 h=300", () => {
    const result = parseBundleFile(listaPath);
    const tb = result.artboards.find(a => a.label.includes("Tab Bar"));
    expect(tb).toBeDefined();
    expect(tb!.width).toBe(460);
    expect(tb!.height).toBe(300);
  });

  it("all expected Screen names appear at least once", () => {
    const result = parseBundleFile(listaPath);
    const names = new Set(result.artboards.map(a => a.screenName));
    expect(names).toContain("ScreenEmpty");
    expect(names).toContain("ScreenWithItems");
    expect(names).toContain("ScreenDense");
    expect(names).toContain("ScreenCompleted");
    expect(names).toContain("ScreenChecked");
    expect(names).toContain("ScreenListaConcluida");
  });

  it("preserves source location for each Artboard", () => {
    const result = parseBundleFile(listaPath);
    for (const a of result.artboards) {
      expect(a.loc).toBeDefined();
      expect(a.loc!.line).toBeGreaterThan(0);
    }
  });
});

describe("extractArtboards · editor-pos-scan.jsx (DCArtboard wrapper)", () => {
  const editorPath = path.join(FIXTURE_DIR, "editor-pos-scan.jsx");

  it("finds DCArtboard wrappers when default wrapper list is used", () => {
    const result = parseBundleFile(editorPath);
    expect(result.artboards.length).toBeGreaterThan(0);
    // editor uses DCArtboard
    expect(result.artboards.every(a => a.wrapperTag === "DCArtboard")).toBe(true);
  });

  it("custom wrapperNames option respects the filter", () => {
    const result = parseBundleFile(editorPath, { wrapperNames: ["Artboard"] });
    // editor doesn't use "Artboard" — only "DCArtboard"
    expect(result.artboards).toHaveLength(0);
  });
});
