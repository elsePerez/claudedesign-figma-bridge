import * as t from "@babel/types";
import type { File } from "@babel/types";
import { traverse } from "./babel-interop.js";
import type { Artboard, ExtractOptions, JsxLoc } from "./types.js";

const DEFAULT_WRAPPERS = ["Artboard", "DCArtboard"];

/**
 * Find all Artboard wrappers in the AST and extract `{label, screenName, w, h}`.
 *
 * An Artboard is any JSX element whose tag is in `wrapperNames` (default:
 * "Artboard" or "DCArtboard"). The screenName is the tag of the first child
 * JSXElement inside it (e.g. <Artboard><ScreenEmpty /></Artboard>).
 */
export function extractArtboards(ast: File, options: ExtractOptions = {}): Artboard[] {
  const wrapperNames = new Set(options.wrapperNames ?? DEFAULT_WRAPPERS);
  const artboards: Artboard[] = [];

  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement;
      const name = opening.name;
      if (!t.isJSXIdentifier(name) || !wrapperNames.has(name.name)) return;

      const wrapperTag = name.name;
      const label = readStringAttr(opening.attributes, "label") ?? "";
      const width = readNumberAttr(opening.attributes, "w") ?? 402;
      const height = readNumberAttr(opening.attributes, "h") ?? 874;

      // screenName: the tag of the first child JSXElement
      let screenName = "";
      for (const child of path.node.children) {
        if (t.isJSXElement(child)) {
          const cname = child.openingElement.name;
          if (t.isJSXIdentifier(cname)) {
            screenName = cname.name;
            break;
          }
        }
      }

      artboards.push({
        label,
        screenName,
        width,
        height,
        wrapperTag,
        loc: locOf(opening.loc?.start),
      });
    },
  });

  return artboards;
}

function readStringAttr(attrs: t.JSXOpeningElement["attributes"], name: string): string | null {
  for (const a of attrs) {
    if (!t.isJSXAttribute(a)) continue;
    if (!t.isJSXIdentifier(a.name)) continue;
    if (a.name.name !== name) continue;
    if (t.isStringLiteral(a.value)) return a.value.value;
    if (t.isJSXExpressionContainer(a.value) && t.isStringLiteral(a.value.expression)) {
      return a.value.expression.value;
    }
    return null;
  }
  return null;
}

function readNumberAttr(attrs: t.JSXOpeningElement["attributes"], name: string): number | null {
  for (const a of attrs) {
    if (!t.isJSXAttribute(a)) continue;
    if (!t.isJSXIdentifier(a.name)) continue;
    if (a.name.name !== name) continue;
    if (t.isStringLiteral(a.value)) {
      const n = Number(a.value.value);
      return Number.isFinite(n) ? n : null;
    }
    if (t.isJSXExpressionContainer(a.value)) {
      const e = a.value.expression;
      if (t.isNumericLiteral(e)) return e.value;
      if (t.isUnaryExpression(e) && e.operator === "-" && t.isNumericLiteral(e.argument)) {
        return -e.argument.value;
      }
    }
    return null;
  }
  return null;
}

function locOf(p: { line: number; column: number } | null | undefined): JsxLoc | undefined {
  if (!p) return undefined;
  return { line: p.line, column: p.column };
}
