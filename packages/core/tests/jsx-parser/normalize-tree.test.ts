import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseScreen } from "../../src/jsx-parser/index.js";
import type { JsxNode } from "../../src/jsx-parser/index.js";

const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

const LISTA = path.join(FIXTURE_DIR, "lista-screen.jsx");

function findFirstByTag(node: JsxNode, tag: string): JsxNode | null {
  if (node.tag === tag) return node;
  for (const c of node.children) {
    const hit = findFirstByTag(c, tag);
    if (hit) return hit;
  }
  return null;
}

function elementChildren(node: JsxNode): JsxNode[] {
  return node.children.filter(c => c.type === "element");
}

describe("normalizeScreenTree · ScreenEmpty", () => {
  it("returns a tree rooted at <Phone>", () => {
    const tree = parseScreen(LISTA, "ScreenEmpty");
    expect(tree).not.toBeNull();
    expect(tree!.tag).toBe("Phone");
    expect(tree!.isComponent).toBe(true);
  });

  it("Phone contains StatusBar, ListaHeader, body div, TabBar4 as direct element children", () => {
    const tree = parseScreen(LISTA, "ScreenEmpty");
    const tags = elementChildren(tree!).map(c => c.tag);
    expect(tags).toContain("StatusBar");
    expect(tags).toContain("ListaHeader");
    expect(tags).toContain("TabBar4");
    expect(tags.includes("div")).toBe(true);
  });

  it("ListaHeader carries count=0 prop", () => {
    const tree = parseScreen(LISTA, "ScreenEmpty");
    const header = elementChildren(tree!).find(c => c.tag === "ListaHeader");
    expect(header).toBeDefined();
    expect(header!.props.count).toEqual({ kind: "number", value: 0 });
  });

  it("TabBar4 carries active='lista' prop", () => {
    const tree = parseScreen(LISTA, "ScreenEmpty");
    const tabBar = elementChildren(tree!).find(c => c.tag === "TabBar4");
    expect(tabBar).toBeDefined();
    expect(tabBar!.props.active).toEqual({ kind: "string", value: "lista" });
  });

  it("contains a SuggestionLine for Leite Integral", () => {
    const tree = parseScreen(LISTA, "ScreenEmpty");
    const stack = findFirstByTag(tree!, "SuggestionLine");
    // We expect at least one SuggestionLine inside the screen
    expect(stack).not.toBeNull();
    // The first SuggestionLine should have `name="Leite Integral"`
    let leite: JsxNode | null = null;
    function walk(n: JsxNode): void {
      if (n.tag === "SuggestionLine") {
        const nm = n.props.name;
        if (nm && nm.kind === "string" && nm.value === "Leite Integral") leite = n;
      }
      for (const c of n.children) walk(c);
    }
    walk(tree!);
    expect(leite).not.toBeNull();
    expect(leite!.props.reason).toEqual({ kind: "string", value: "Está acabando · 1 un" });
    expect(leite!.props.emoji).toEqual({ kind: "string", value: "🥛" });
    expect(leite!.props.big).toEqual({ kind: "boolean", value: true });
  });

  it("preserves inline style on the body div (padding from JSX)", () => {
    const tree = parseScreen(LISTA, "ScreenEmpty");
    const bodyDiv = elementChildren(tree!).find(
      c => c.tag === "div" && Object.keys(c.style).length > 0,
    );
    expect(bodyDiv).toBeDefined();
    // JSX has: style={{ flex: 1, overflow: 'hidden', padding: '4px 16px 0' }}
    expect(bodyDiv!.style.flex).toEqual({ kind: "number", value: 1 });
    expect(bodyDiv!.style.overflow).toEqual({ kind: "string", value: "hidden" });
    expect(bodyDiv!.style.padding).toEqual({ kind: "string", value: "4px 16px 0" });
  });

  it("returns null for an unknown screen name", () => {
    const tree = parseScreen(LISTA, "ScreenDoesNotExist");
    expect(tree).toBeNull();
  });
});
