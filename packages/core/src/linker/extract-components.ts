import * as t from "@babel/types";
import { parseJsxFile } from "../jsx-parser/parse-jsx-file.js";
import { traverse } from "../jsx-parser/babel-interop.js";
import { normalizeScreenTree } from "../jsx-parser/normalize-tree.js";
import type { JsxNode } from "../jsx-parser/index.js";
import type { ComponentDef } from "./types.js";

/**
 * Walk a JSX file and collect every function-or-arrow component (anything
 * that returns JSX). Captures destructured prop names + default values
 * from the function signature and flags the component as "complex" if it
 * touches useState, useEffect, .map(), or other dynamic constructs we
 * can't substitute statically.
 */
export function extractComponents(jsxPath: string): Map<string, ComponentDef> {
  const ast = parseJsxFile(jsxPath);
  const componentNames: string[] = [];
  const signatures = new Map<
    string,
    { paramNames: string[]; paramDefaults: ComponentDef["paramDefaults"]; isComplex: boolean }
  >();

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (!name || !/^[A-Z]/.test(name)) return;
      componentNames.push(name);
      signatures.set(name, gatherSignature(path.node.params, path.node.body));
    },
    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id)) return;
      const name = path.node.id.name;
      if (!/^[A-Z]/.test(name)) return;
      const init = path.node.init;
      if (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init)) return;
      componentNames.push(name);
      signatures.set(name, gatherSignature(init.params, init.body));
    },
  });

  // Parse each component's body via the public normalizeScreenTree helper
  const result = new Map<string, ComponentDef>();
  for (const name of componentNames) {
    const sig = signatures.get(name);
    if (!sig) continue;
    const body = normalizeScreenTree(ast, name);
    result.set(name, {
      name,
      paramNames: sig.paramNames,
      paramDefaults: sig.paramDefaults,
      isComplex: sig.isComplex,
      body,
    });
  }
  return result;
}

function gatherSignature(
  params: (t.Identifier | t.Pattern | t.RestElement)[],
  body: t.BlockStatement | t.Expression,
): { paramNames: string[]; paramDefaults: ComponentDef["paramDefaults"]; isComplex: boolean } {
  const paramNames: string[] = [];
  const paramDefaults: ComponentDef["paramDefaults"] = {};

  const first = params[0];
  if (first && t.isObjectPattern(first)) {
    for (const prop of first.properties) {
      if (!t.isObjectProperty(prop)) continue;
      if (!t.isIdentifier(prop.key)) continue;
      const key = prop.key.name;
      paramNames.push(key);
      // Default value support: `{ placeholder = 'Adicionar item…' }`
      if (t.isAssignmentPattern(prop.value)) {
        paramDefaults[key] = literalOf(prop.value.right);
      }
    }
  }

  // Body complexity — actual AST traversal, not regex on identifier names.
  // Triggers: useState/useEffect/useMemo hooks, or any .map()/.filter()/etc.
  // CallExpression (MemberExpression-style array methods make linking unsafe).
  let isComplex = false;
  function visit(n: t.Node | null | undefined): void {
    if (isComplex || !n || typeof n !== "object") return;
    if (t.isCallExpression(n)) {
      const callee = n.callee;
      if (t.isIdentifier(callee) && /^use[A-Z]/.test(callee.name)) {
        isComplex = true;
        return;
      }
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        const method = callee.property.name;
        if (["map", "filter", "reduce", "forEach", "flatMap"].includes(method)) {
          isComplex = true;
          return;
        }
      }
    }
    for (const key of Object.keys(n)) {
      const v = (n as unknown as Record<string, unknown>)[key];
      if (v && typeof v === "object") {
        if (Array.isArray(v)) v.forEach(c => visit(c as t.Node));
        else visit(v as t.Node);
      }
    }
  }
  visit(body);

  return { paramNames, paramDefaults, isComplex };
}

function literalOf(node: t.Node): string | number | boolean | null {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return node.value;
  if (t.isBooleanLiteral(node)) return node.value;
  if (t.isNullLiteral(node)) return null;
  return null;
}

/** Helper kept for external callers if needed. */
export function normalizeJsxNodeOrNull(n: JsxNode | null): JsxNode | null {
  return n;
}
