import type { JsxNode, JsxPropValue } from "../jsx-parser/index.js";
import { normalizeValue, normalizeJsxKey } from "../token-resolver/normalize-name.js";
import type {
  RawToken,
  ReconciliationResult,
  TokenSource,
} from "../token-resolver/index.js";
import type {
  IntentArtboard,
  IntentDriftEntry,
  IntentNode,
  IntentOrphanEntry,
  IntentValue,
} from "./types.js";

export interface BuildIntentOptions {
  label: string;
  screenName: string;
  size: { width: number; height: number };
  jsxTree: JsxNode;
  /** Light-mode reconciliation result from token-resolver. */
  reconciliation: ReconciliationResult;
  /** Raw token sources — used to resolve JSX expressions like `T.surface`. */
  sources: TokenSource[];
}

/**
 * Build the canonical IntentArtboard for a screen.
 *
 * Process:
 *   1. Build a reverse map: normalized color literal → Swift semantic name
 *   2. Build a JSX T-object resolver: semantic name → JSX literal value
 *   3. Walk the JsxNode tree, converting each prop/style JsxPropValue into
 *      an IntentValue. Color-looking literals get bound to Swift tokens
 *      when their hex matches; T.<key> expressions get resolved to their
 *      JSX literal value (and then re-bound against Swift if the literal
 *      matches).
 */
export function buildIntent(options: BuildIntentOptions): IntentArtboard {
  const swiftReverseMap = buildSwiftReverseMap(options.sources);
  const jsxResolver = buildJsxResolver(options.sources);
  const ctx: ResolveContext = { swiftReverseMap, jsxResolver };

  const root = jsxNodeToIntent(options.jsxTree, ctx);
  const drifts = mapDrifts(options.reconciliation);
  const orphans = mapOrphans(options.reconciliation);

  return {
    schemaVersion: 1,
    label: options.label,
    screenName: options.screenName,
    size: options.size,
    root,
    drifts,
    orphans,
  };
}

interface ResolveContext {
  swiftReverseMap: Map<string, string>;
  jsxResolver: Map<string, string>;
}

function jsxNodeToIntent(node: JsxNode, ctx: ResolveContext): IntentNode {
  const props: Record<string, IntentValue> = {};
  const style: Record<string, IntentValue> = {};

  for (const [k, v] of Object.entries(node.props)) {
    props[k] = jsxValueToIntent(v, ctx);
  }
  for (const [k, v] of Object.entries(node.style)) {
    style[k] = jsxValueToIntent(v, ctx);
  }

  return {
    type: node.type,
    tag: node.tag,
    isComponent: node.isComponent,
    props,
    style,
    children: node.children.map(c => jsxNodeToIntent(c, ctx)),
    text: node.text,
  };
}

function jsxValueToIntent(v: JsxPropValue, ctx: ResolveContext): IntentValue {
  switch (v.kind) {
    case "string": {
      const normalized = normalizeValue(v.value);
      if (looksLikeColor(normalized)) {
        return colorIntent(normalized, undefined, ctx);
      }
      return { kind: "string", value: v.value };
    }
    case "number":
      return { kind: "number", value: v.value };
    case "boolean":
      return { kind: "boolean", value: v.value };
    case "null":
      return { kind: "null" };
    case "object": {
      const inner: Record<string, IntentValue> = {};
      for (const [k, val] of Object.entries(v.value)) {
        inner[k] = jsxValueToIntent(val, ctx);
      }
      return { kind: "object", value: inner };
    }
    case "array":
      return { kind: "array", value: v.value.map(x => jsxValueToIntent(x, ctx)) };
    case "expression": {
      // Resolve T.<key> member access via JSX resolver
      const m = v.source.match(/^T\.(\w+)$/);
      if (m) {
        const semantic = normalizeJsxKey(m[1]!);
        const literal = ctx.jsxResolver.get(semantic);
        if (literal !== undefined) {
          const normalized = normalizeValue(literal);
          return colorIntent(normalized, `T.${m[1]}`, ctx);
        }
      }
      return { kind: "expression", source: v.source };
    }
    case "ternary":
    case "logical":
    case "binary":
      // Unevaluated control-flow expressions reach intent-build only when the
      // linker couldn't fold them (missing prop bindings, dynamic conditions).
      // Render as an inspection-friendly expression entry so downstream
      // emitters can render a stub or skip without crashing.
      return { kind: "expression", source: `<${v.kind}>` };
  }
}

function colorIntent(
  literal: string,
  jsxRef: string | undefined,
  ctx: ResolveContext,
): IntentValue {
  const swiftBinding = ctx.swiftReverseMap.get(literal);
  if (swiftBinding) {
    return { kind: "color", literal, jsxRef, swiftBinding };
  }
  return { kind: "color", literal, jsxRef, isOrphan: true };
}

function looksLikeColor(v: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(v) || /^rgba?\(/i.test(v) || /^linear-gradient\(/i.test(v);
}

function buildSwiftReverseMap(sources: TokenSource[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const src of sources) {
    if (src.source !== "swift") continue;
    for (const tok of src.tokens) {
      if (tok.mode === "dark") continue;
      map.set(normalizeValue(tok.value), tok.semanticName);
    }
  }
  return map;
}

function buildJsxResolver(sources: TokenSource[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const src of sources) {
    if (src.source !== "jsx") continue;
    for (const tok of src.tokens) {
      map.set(tok.semanticName, tok.value);
    }
  }
  return map;
}

function mapDrifts(r: ReconciliationResult): IntentDriftEntry[] {
  return r.drifts.map(d => ({
    semanticName: d.semanticName,
    status: d.status,
    swiftValue: d.swiftValue,
    cssValue: d.cssValue,
    jsxValue: d.jsxValue,
    note: d.note,
  }));
}

function mapOrphans(r: ReconciliationResult): IntentOrphanEntry[] {
  return r.orphans.map(o => ({ value: o.value, sourceKey: o.sourceKey }));
}
