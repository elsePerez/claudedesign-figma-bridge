import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIntentFromBundle } from "../../src/intent-builder/index.js";
import type { IntentNode, IntentValue } from "../../src/intent-builder/index.js";

const FX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

function intent() {
  return buildIntentFromBundle({
    jsxPath: path.join(FX, "lista-screen.jsx"),
    cssPath: path.join(FX, "bundle-colors-and-type.css"),
    swiftColorsetsDir: path.join(FX, "swift-colorsets"),
    screenName: "ScreenEmpty",
    label: "01 · Lista vazia (Padrão B)",
  });
}

function findFirst(node: IntentNode, predicate: (n: IntentNode) => boolean): IntentNode | null {
  if (predicate(node)) return node;
  for (const c of node.children) {
    const hit = findFirst(c, predicate);
    if (hit) return hit;
  }
  return null;
}

describe("buildIntentFromBundle · ScreenEmpty", () => {
  it("returns an IntentArtboard with the expected metadata", () => {
    const it_ = intent();
    expect(it_.schemaVersion).toBe(1);
    expect(it_.label).toBe("01 · Lista vazia (Padrão B)");
    expect(it_.screenName).toBe("ScreenEmpty");
    expect(it_.size).toEqual({ width: 402, height: 874 });
    expect(it_.root.tag).toBe("Phone");
  });

  it("propagates drifts from reconciliation (6 jsx drifts expected)", () => {
    const it_ = intent();
    const driftJsx = it_.drifts.filter(d => d.status === "drift-jsx");
    expect(driftJsx.length).toBeGreaterThanOrEqual(6);
    const names = new Set(driftJsx.map(d => d.semanticName));
    expect(names).toContain("background");
    expect(names).toContain("surface");
    expect(names).toContain("primaryContainer");
    expect(names).toContain("warningContainer");
  });

  it("propagates orphans (alpha-shortcut rgba values)", () => {
    const it_ = intent();
    const orphanValues = it_.orphans.map(o => o.value);
    expect(orphanValues).toContain("rgba(33,33,33,.06)");
    expect(orphanValues).toContain("rgba(245,72,68,.12)");
    expect(orphanValues).toContain("rgba(255,152,0,.12)");
  });

  it("binds inline style hex literals to Swift tokens where they match", () => {
    const it_ = intent();
    // Find an IconContainer-shaped node: a div with background = #FFFFFF and a border
    const iconBoxLike = findFirst(it_.root, (n: IntentNode) => {
      const bg = n.style.background;
      return n.tag === "div" && !!bg && bg.kind === "color" && bg.literal === "#FFFFFF";
    });
    expect(iconBoxLike).not.toBeNull();
    const bg = iconBoxLike!.style.background as IntentValue;
    expect(bg.kind).toBe("color");
    if (bg.kind === "color") {
      expect(bg.swiftBinding).toBe("background");
    }
  });

  it("resolves T.<key> expressions and binds to Swift", () => {
    const it_ = intent();
    // The body div uses T.outlineVariant via expression — make sure something
    // in the tree carries jsxRef "T.outlineVariant" with isOrphan=true
    // (alpha-shortcut doesn't match Swift #BDBDBD).
    let found: IntentValue | null = null;
    function walk(n: IntentNode): void {
      for (const v of Object.values(n.style)) {
        if (v.kind === "color" && v.jsxRef === "T.outlineVariant") {
          found = v;
          return;
        }
      }
      for (const c of n.children) {
        walk(c);
        if (found) return;
      }
    }
    walk(it_.root);
    expect(found).not.toBeNull();
    if (found && found.kind === "color") {
      expect(found.literal).toBe("rgba(33,33,33,.06)");
      expect(found.isOrphan).toBe(true);
    }
  });

  it("preserves non-color string and number values verbatim", () => {
    const it_ = intent();
    // Find the body div (has padding string)
    const body = findFirst(it_.root, (n: IntentNode) => {
      const p = n.style.padding;
      return n.tag === "div" && !!p && p.kind === "string" && p.value === "4px 16px 0";
    });
    expect(body).not.toBeNull();
    expect(body!.style.flex).toEqual({ kind: "number", value: 1 });
    expect(body!.style.overflow).toEqual({ kind: "string", value: "hidden" });
  });

  it("throws when the screen name is unknown", () => {
    expect(() =>
      buildIntentFromBundle({
        jsxPath: path.join(FX, "lista-screen.jsx"),
        screenName: "DoesNotExist",
        label: "x",
      }),
    ).toThrow();
  });
});
