import { describe, it, expect } from "vitest";
import { diffStructure, type FigmaNodeSnapshot } from "../src/index.js";
import type { IntentArtboard, IntentNode } from "@cdf/core";

function el(tag: string, children: IntentNode[] = []): IntentNode {
  return {
    type: "element",
    tag,
    isComponent: /^[A-Z]/.test(tag),
    props: {},
    style: {},
    children,
  };
}

function fmNode(name: string, children: FigmaNodeSnapshot[] = [], type = "FRAME"): FigmaNodeSnapshot {
  return { name, type, children };
}

function intentOf(root: IntentNode): IntentArtboard {
  return {
    schemaVersion: 1,
    label: "test",
    screenName: "test",
    size: { width: 100, height: 100 },
    root,
    drifts: [],
    orphans: [],
  };
}

describe("diffStructure", () => {
  it("returns errorCount=0 for perfect match", () => {
    const intent = intentOf(el("Phone", [el("StatusBar"), el("ListaHeader"), el("TabBar4")]));
    const figma = fmNode("Phone", [fmNode("StatusBar"), fmNode("ListaHeader"), fmNode("TabBar4")]);
    const result = diffStructure(intent, figma);
    expect(result.errorCount).toBe(0);
  });

  it("flags missing-in-figma when a child is absent", () => {
    const intent = intentOf(el("Phone", [el("StatusBar"), el("ListaHeader"), el("TabBar4")]));
    const figma = fmNode("Phone", [fmNode("StatusBar"), fmNode("ListaHeader")]);
    const result = diffStructure(intent, figma);
    expect(result.entries.some(e => e.kind === "missing-in-figma" && e.expected === "TabBar4")).toBe(true);
  });

  it("flags extra-in-figma when Figma has more children", () => {
    const intent = intentOf(el("Phone", [el("StatusBar")]));
    const figma = fmNode("Phone", [fmNode("StatusBar"), fmNode("Bonus")]);
    const result = diffStructure(intent, figma);
    expect(result.entries.some(e => e.kind === "extra-in-figma" && e.actual === "Bonus")).toBe(true);
  });

  it("flags name-mismatch when tags don't agree", () => {
    const intent = intentOf(el("Phone", [el("StatusBar")]));
    const figma = fmNode("Phone", [fmNode("Wrong")]);
    const result = diffStructure(intent, figma);
    expect(result.entries.some(e => e.kind === "name-mismatch")).toBe(true);
  });
});
