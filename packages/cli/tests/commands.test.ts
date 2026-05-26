import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { runParse, runTokens, runPlan, runEmit } from "../src/index.js";
import * as fs from "node:fs";
import * as os from "node:os";

const FX = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../core/tests/fixtures",
);

describe("cdf parse", () => {
  it("table format reports 24 Artboards for Lista", () => {
    const out = runParse({
      jsxPath: path.join(FX, "lista-screen.jsx"),
      format: "table",
    });
    expect(out).toContain("Artboards: 24");
    expect(out).toContain("01 · Lista vazia (Padrão B)");
    expect(out).toContain("ScreenEmpty");
  });

  it("--screen mode dumps the tree as JSON with Phone root", () => {
    const out = runParse({
      jsxPath: path.join(FX, "lista-screen.jsx"),
      screen: "ScreenEmpty",
    });
    const tree = JSON.parse(out);
    expect(tree.tag).toBe("Phone");
  });
});

describe("cdf tokens", () => {
  it("table format includes drift entries for ScreenEmpty's slice", () => {
    const out = runTokens({
      jsxPath: path.join(FX, "lista-screen.jsx"),
      cssPath: path.join(FX, "bundle-colors-and-type.css"),
      swiftDir: path.join(FX, "swift-colorsets"),
      format: "table",
    });
    expect(out).toContain("background");
    expect(out).toContain("drift-jsx");
    expect(out).toContain("Orphan JSX values");
  });
});

describe("cdf plan + emit roundtrip", () => {
  it("plan outputs IntentArtboard JSON, emit converts to a script string", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdf-"));
    const intentPath = path.join(tmpDir, "intent.json");

    const intentJson = runPlan({
      jsxPath: path.join(FX, "lista-screen.jsx"),
      screen: "ScreenEmpty",
      label: "01 · Lista vazia (Padrão B)",
      cssPath: path.join(FX, "bundle-colors-and-type.css"),
      swiftDir: path.join(FX, "swift-colorsets"),
    });
    fs.writeFileSync(intentPath, intentJson, "utf-8");

    const parsed = JSON.parse(intentJson);
    expect(parsed.schemaVersion).toBe(1);
    // With the linker enabled (CLI default), Phone is inlined and the root
    // becomes the outer div from Phone's body (radius 50, black fill).
    expect(parsed.root.tag).toBe("div");
    expect(parsed.root.style.borderRadius).toEqual({ kind: "number", value: 50 });

    const script = runEmit({ intentPath, pageId: "6504:2" });
    expect(script).toContain("setCurrentPageAsync");
    expect(script).toContain("createdNodeIds");
    expect(script).toContain(`"6504:2"`);
  });
});
