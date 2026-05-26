import * as t from "@babel/types";
import type { File } from "@babel/types";
import { traverse } from "./babel-interop.js";
import type { JsxNode, JsxPropValue, JsxLoc } from "./types.js";

/**
 * Find the function/const declaration named `screenName`, then walk its
 * returned JSX and produce a normalized JsxNode tree.
 *
 * Returns null if the screen isn't defined or doesn't return JSX directly.
 */
export function normalizeScreenTree(ast: File, screenName: string): JsxNode | null {
  let rootJsx: t.JSXElement | t.JSXFragment | null = null;

  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id?.name !== screenName) return;
      path.traverse({
        ReturnStatement(rp) {
          if (rootJsx) return;
          const arg = rp.node.argument;
          if (t.isJSXElement(arg) || t.isJSXFragment(arg)) rootJsx = arg;
        },
      });
    },
    VariableDeclarator(path) {
      if (rootJsx) return;
      if (!t.isIdentifier(path.node.id) || path.node.id.name !== screenName) return;
      const init = path.node.init;
      // const Foo = () => <jsx/>
      if (t.isArrowFunctionExpression(init)) {
        if (t.isJSXElement(init.body) || t.isJSXFragment(init.body)) {
          rootJsx = init.body;
        } else if (t.isBlockStatement(init.body)) {
          path.traverse({
            ReturnStatement(rp) {
              if (rootJsx) return;
              const arg = rp.node.argument;
              if (t.isJSXElement(arg) || t.isJSXFragment(arg)) rootJsx = arg;
            },
          });
        }
      }
    },
  });

  if (!rootJsx) return null;
  return jsxToNode(rootJsx);
}

function jsxToNode(node: t.Node): JsxNode {
  if (t.isJSXText(node)) {
    return textNode(node.value, locOf(node.loc?.start));
  }
  if (t.isJSXExpressionContainer(node)) {
    return {
      type: "expression",
      tag: "",
      isComponent: false,
      props: {},
      style: {},
      children: [],
      expression: nodeKindLabel(node.expression),
      loc: locOf(node.loc?.start),
    };
  }
  if (t.isJSXFragment(node)) {
    return {
      type: "element",
      tag: "Fragment",
      isComponent: true,
      props: {},
      style: {},
      children: collectChildren(node.children),
      loc: locOf(node.loc?.start),
    };
  }
  if (!t.isJSXElement(node)) {
    return textNode("", undefined);
  }

  const opening = node.openingElement;
  const tag = jsxNameToString(opening.name);
  const isComponent = /^[A-Z]/.test(tag);

  const props: Record<string, JsxPropValue> = {};
  let style: Record<string, JsxPropValue> = {};

  for (const attr of opening.attributes) {
    if (!t.isJSXAttribute(attr)) continue;
    if (!t.isJSXIdentifier(attr.name)) continue;
    const name = attr.name.name;
    const value = attrValueToPropValue(attr.value);
    if (value === null) continue;
    if (name === "style" && value.kind === "object") {
      style = value.value;
    } else {
      props[name] = value;
    }
  }

  return {
    type: "element",
    tag,
    isComponent,
    props,
    style,
    children: collectChildren(node.children),
    loc: locOf(opening.loc?.start),
  };
}

function collectChildren(children: t.Node[]): JsxNode[] {
  return children
    .map((c): JsxNode | null => {
      if (t.isJSXElement(c) || t.isJSXFragment(c) || t.isJSXExpressionContainer(c)) return jsxToNode(c);
      if (t.isJSXText(c)) return jsxToNode(c);
      return null;
    })
    .filter((n): n is JsxNode => n !== null)
    .filter(n => !(n.type === "text" && (n.text ?? "").trim() === ""));
}

function textNode(text: string, loc: JsxLoc | undefined): JsxNode {
  return {
    type: "text",
    tag: "",
    isComponent: false,
    props: {},
    style: {},
    children: [],
    text,
    loc,
  };
}

function jsxNameToString(name: t.JSXOpeningElement["name"]): string {
  if (t.isJSXIdentifier(name)) return name.name;
  if (t.isJSXMemberExpression(name)) {
    return `${jsxNameToString(name.object)}.${name.property.name}`;
  }
  if (t.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`;
  }
  return "<unknown>";
}

function attrValueToPropValue(value: t.JSXAttribute["value"]): JsxPropValue | null {
  if (value === null || value === undefined) return { kind: "boolean", value: true };
  if (t.isStringLiteral(value)) return { kind: "string", value: value.value };
  if (t.isJSXExpressionContainer(value)) {
    return exprToPropValue(value.expression);
  }
  return null;
}

function exprToPropValue(expr: t.Expression | t.JSXEmptyExpression): JsxPropValue {
  if (t.isJSXEmptyExpression(expr)) return { kind: "expression", source: "" };
  if (t.isStringLiteral(expr)) return { kind: "string", value: expr.value };
  if (t.isNumericLiteral(expr)) return { kind: "number", value: expr.value };
  if (t.isBooleanLiteral(expr)) return { kind: "boolean", value: expr.value };
  if (t.isNullLiteral(expr)) return { kind: "null" };
  if (t.isUnaryExpression(expr) && expr.operator === "-" && t.isNumericLiteral(expr.argument)) {
    return { kind: "number", value: -expr.argument.value };
  }
  if (t.isTemplateLiteral(expr) && expr.expressions.length === 0 && expr.quasis.length === 1) {
    return { kind: "string", value: expr.quasis[0]!.value.cooked ?? "" };
  }
  if (t.isConditionalExpression(expr)) {
    return {
      kind: "ternary",
      test: exprToPropValue(expr.test),
      then: exprToPropValue(expr.consequent),
      else: exprToPropValue(expr.alternate),
    };
  }
  if (t.isLogicalExpression(expr)) {
    return {
      kind: "logical",
      op: expr.operator as "&&" | "||" | "??",
      left: exprToPropValue(expr.left),
      right: exprToPropValue(expr.right),
    };
  }
  if (t.isBinaryExpression(expr)) {
    const left = t.isExpression(expr.left) ? exprToPropValue(expr.left) : { kind: "expression" as const, source: "?" };
    return {
      kind: "binary",
      op: expr.operator,
      left,
      right: exprToPropValue(expr.right),
    };
  }
  if (t.isObjectExpression(expr)) {
    const out: Record<string, JsxPropValue> = {};
    for (const prop of expr.properties) {
      if (!t.isObjectProperty(prop)) continue;
      let key = "";
      if (t.isIdentifier(prop.key)) key = prop.key.name;
      else if (t.isStringLiteral(prop.key)) key = prop.key.value;
      else continue;
      if (t.isExpression(prop.value)) {
        out[key] = exprToPropValue(prop.value);
      }
    }
    return { kind: "object", value: out };
  }
  if (t.isArrayExpression(expr)) {
    const items: JsxPropValue[] = [];
    for (const el of expr.elements) {
      if (el === null) continue;
      if (t.isSpreadElement(el)) continue;
      if (t.isExpression(el)) items.push(exprToPropValue(el));
    }
    return { kind: "array", value: items };
  }
  return { kind: "expression", source: nodeKindLabel(expr) };
}

/** Best-effort source label for an expression we couldn't statically resolve. */
function nodeKindLabel(expr: t.Node): string {
  if (t.isIdentifier(expr)) return expr.name;
  if (t.isMemberExpression(expr)) {
    const obj = t.isIdentifier(expr.object) ? expr.object.name : "?";
    const prop = t.isIdentifier(expr.property) ? expr.property.name : "?";
    return `${obj}.${prop}`;
  }
  return `<${expr.type}>`;
}

function locOf(p: { line: number; column: number } | null | undefined): JsxLoc | undefined {
  if (!p) return undefined;
  return { line: p.line, column: p.column };
}
