import type { JsxNode, JsxPropValue } from "../jsx-parser/index.js";
import type { ComponentDef, LinkOptions } from "./types.js";

/**
 * Inline custom-component references in a JsxNode tree.
 *
 * For every element node whose tag matches a known component:
 *   - If the component is non-complex, splice its body into the tree,
 *     substituting `{children}` references with the call-site children
 *     and `{<prop>}` identifier expressions with the call-site prop value.
 *   - If the component is complex (useState, .map, etc), leave the node
 *     unchanged (renders as a stub frame named after the component).
 *
 * The substitution is shallow-by-default and intentionally avoids running
 * arbitrary JavaScript. Anything beyond an identifier expression or a
 * literal default falls through as an `expression` JsxValue, which the
 * emitter ignores. This matches the bridge's "explicit drift over silent
 * guesses" stance — we'd rather leave a known gap than fabricate behavior.
 */
export function linkComponents(
  tree: JsxNode,
  components: Map<string, ComponentDef>,
  options: LinkOptions = {},
): JsxNode {
  const maxDepth = options.maxDepth ?? 6;
  return linkNode(tree, components, maxDepth, []);
}

function linkNode(
  node: JsxNode,
  components: Map<string, ComponentDef>,
  remainingDepth: number,
  callStack: string[],
): JsxNode {
  if (remainingDepth <= 0) return node;
  if (node.type !== "element") return node;

  // Recurse into children first so nested references get linked
  const linkedChildren = node.children.map(c =>
    linkNode(c, components, remainingDepth - 1, callStack),
  );

  const def = node.isComponent ? components.get(node.tag) : undefined;

  // Plain HTML element / unknown component / cycle guard / complex component
  if (!def || !def.body || def.isComplex || callStack.includes(node.tag)) {
    return { ...node, children: linkedChildren };
  }

  // Resolve the props for substitution
  const propBindings: Record<string, JsxPropValue> = { ...node.props };

  // "children" is implicit — bind it to the literal child list
  if (def.paramNames.includes("children")) {
    propBindings.children = childrenAsArrayValue(linkedChildren);
  }
  // Apply defaults for missing props
  for (const param of def.paramNames) {
    if (!(param in propBindings) && param in def.paramDefaults) {
      const dflt = def.paramDefaults[param];
      if (dflt !== undefined) {
        propBindings[param] = defaultToPropValue(dflt);
      }
    }
  }

  // Substitute and recurse
  const substituted = substitute(def.body, propBindings, linkedChildren);
  return linkNode(substituted, components, remainingDepth - 1, [...callStack, node.tag]);
}

function defaultToPropValue(v: string | number | boolean | null): JsxPropValue {
  if (typeof v === "string") return { kind: "string", value: v };
  if (typeof v === "number") return { kind: "number", value: v };
  if (typeof v === "boolean") return { kind: "boolean", value: v };
  return { kind: "null" };
}

function childrenAsArrayValue(children: JsxNode[]): JsxPropValue {
  // Placeholder — `children` substitution is handled by tag-replacement,
  // not by prop value lookup. Keep the slot present so it isn't treated
  // as "missing prop".
  return { kind: "expression", source: `__children_count_${children.length}` };
}

/**
 * Walk the component body and:
 *   - Replace expression nodes referencing `children` with the actual
 *     children passed at the call site.
 *   - Replace expression nodes that are a single identifier matching a
 *     known prop with the literal value of that prop (rendered into the
 *     surrounding context as best we can: string→text, etc).
 *   - Replace expression nodes inside style / prop maps if their source
 *     is a known prop identifier.
 */
function substitute(
  body: JsxNode,
  props: Record<string, JsxPropValue>,
  callSiteChildren: JsxNode[],
): JsxNode {
  function rewrite(n: JsxNode): JsxNode {
    // Whole-node substitution: `{children}` placeholder inside JSX
    if (n.type === "expression" && n.expression === "children") {
      // Emitter doesn't have a "fragment" node yet, so when there's exactly
      // one child, splice it in directly; otherwise wrap in a Fragment.
      if (callSiteChildren.length === 1) return callSiteChildren[0]!;
      return {
        type: "element",
        tag: "Fragment",
        isComponent: true,
        props: {},
        style: {},
        children: callSiteChildren,
      };
    }

    // Expression matching a single prop identifier → fold to its literal
    if (n.type === "expression") {
      const v = lookupExprAsValue(n.expression ?? "", props);
      if (v !== null) return propValueAsNode(v);
      return n;
    }

    if (n.type !== "element") return n;

    return {
      ...n,
      // Rewrite props (handles `count={count}` style cases)
      props: rewriteValueMap(n.props, props),
      style: rewriteValueMap(n.style, props),
      children: n.children.map(rewrite),
    };
  }
  return rewrite(body);
}

function rewriteValueMap(
  map: Record<string, JsxPropValue>,
  props: Record<string, JsxPropValue>,
): Record<string, JsxPropValue> {
  const out: Record<string, JsxPropValue> = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = rewriteValue(v, props);
  }
  return out;
}

function rewriteValue(v: JsxPropValue, props: Record<string, JsxPropValue>): JsxPropValue {
  if (v.kind === "expression") {
    const resolved = lookupExprAsValue(v.source, props);
    if (resolved) return resolved;
    return v;
  }
  if (v.kind === "object") {
    const inner: Record<string, JsxPropValue> = {};
    for (const [k, val] of Object.entries(v.value)) inner[k] = rewriteValue(val, props);
    return { kind: "object", value: inner };
  }
  if (v.kind === "array") {
    return { kind: "array", value: v.value.map(x => rewriteValue(x, props)) };
  }
  if (v.kind === "ternary") {
    const test = rewriteValue(v.test, props);
    const truthy = truthyOf(test);
    if (truthy === true) return rewriteValue(v.then, props);
    if (truthy === false) return rewriteValue(v.else, props);
    return {
      kind: "ternary",
      test,
      then: rewriteValue(v.then, props),
      else: rewriteValue(v.else, props),
    };
  }
  if (v.kind === "logical") {
    const left = rewriteValue(v.left, props);
    const truthy = truthyOf(left);
    if (v.op === "&&") {
      if (truthy === false) return left;
      if (truthy === true) return rewriteValue(v.right, props);
    } else if (v.op === "||") {
      if (truthy === true) return left;
      if (truthy === false) return rewriteValue(v.right, props);
    } else if (v.op === "??") {
      if (left.kind !== "null" && truthy !== null) return left;
      return rewriteValue(v.right, props);
    }
    return { kind: "logical", op: v.op, left, right: rewriteValue(v.right, props) };
  }
  if (v.kind === "binary") {
    const left = rewriteValue(v.left, props);
    const right = rewriteValue(v.right, props);
    const computed = computeBinary(v.op, left, right);
    if (computed) return computed;
    return { kind: "binary", op: v.op, left, right };
  }
  return v;
}

function truthyOf(v: JsxPropValue): boolean | null {
  if (v.kind === "boolean") return v.value;
  if (v.kind === "number") return v.value !== 0 && !Number.isNaN(v.value);
  if (v.kind === "string") return v.value.length > 0;
  if (v.kind === "null") return false;
  return null;
}

function computeBinary(op: string, l: JsxPropValue, r: JsxPropValue): JsxPropValue | null {
  if (l.kind === "number" && r.kind === "number") {
    const a = l.value;
    const b = r.value;
    switch (op) {
      case ">":  return { kind: "boolean", value: a > b };
      case "<":  return { kind: "boolean", value: a < b };
      case ">=": return { kind: "boolean", value: a >= b };
      case "<=": return { kind: "boolean", value: a <= b };
      case "===": case "==": return { kind: "boolean", value: a === b };
      case "!==": case "!=": return { kind: "boolean", value: a !== b };
      case "+":  return { kind: "number", value: a + b };
      case "-":  return { kind: "number", value: a - b };
      case "*":  return { kind: "number", value: a * b };
      case "/":  return { kind: "number", value: a / b };
    }
  }
  if (l.kind === "string" && r.kind === "string") {
    switch (op) {
      case "+":  return { kind: "string", value: l.value + r.value };
      case "===": case "==": return { kind: "boolean", value: l.value === r.value };
      case "!==": case "!=": return { kind: "boolean", value: l.value !== r.value };
    }
  }
  return null;
}

function lookupExprAsValue(src: string, props: Record<string, JsxPropValue>): JsxPropValue | null {
  const trimmed = src.trim();
  if (trimmed in props) {
    return props[trimmed]!;
  }
  return null;
}

function propValueAsNode(v: JsxPropValue): JsxNode {
  if (v.kind === "string") {
    return {
      type: "text",
      tag: "",
      isComponent: false,
      props: {},
      style: {},
      children: [],
      text: v.value,
    };
  }
  if (v.kind === "number") {
    return {
      type: "text",
      tag: "",
      isComponent: false,
      props: {},
      style: {},
      children: [],
      text: String(v.value),
    };
  }
  // Other kinds — leave as expression placeholder
  return {
    type: "expression",
    tag: "",
    isComponent: false,
    props: {},
    style: {},
    children: [],
    expression: v.kind,
  };
}
