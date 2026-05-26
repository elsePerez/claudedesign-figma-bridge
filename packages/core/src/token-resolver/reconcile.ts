import { normalizeValue } from "./normalize-name.js";
import type {
  RawToken,
  ReconcileOptions,
  ReconciliationResult,
  TokenDrift,
  TokenOrphan,
  TokenSource,
} from "./types.js";

/**
 * Cross-reference Swift, CSS, and JSX token sources. Produces:
 *   - `map`        : semanticName → { swift?, css?, jsx? } for the chosen mode
 *   - `drifts`     : per-semantic diff status (aligned / drift-jsx / etc)
 *   - `orphans`    : JSX values that don't match any known canonical token
 *
 * Mode: defaults to "any-or-light" — Swift `any` + CSS `:root` (light). Dark
 * variants are intentionally ignored at v1 (Phase 9 expands this).
 */
export function reconcile(
  sources: TokenSource[],
  options: ReconcileOptions = {},
): ReconciliationResult {
  const mode = options.mode ?? "any-or-light";
  const wantCategory = options.category;

  const map: ReconciliationResult["map"] = {};

  for (const src of sources) {
    for (const tok of src.tokens) {
      if (!matchesMode(tok.mode, mode)) continue;
      if (wantCategory && tok.category !== wantCategory) continue;

      const entry = map[tok.semanticName] ?? {};
      // last write per source wins — sources should be deduped already
      if (src.source === "swift") entry.swift = tok.value;
      else if (src.source === "css") entry.css = tok.value;
      else if (src.source === "jsx") entry.jsx = tok.value;
      map[tok.semanticName] = entry;
    }
  }

  const drifts: TokenDrift[] = [];
  for (const [semanticName, vals] of Object.entries(map).sort(([a], [b]) => a.localeCompare(b))) {
    drifts.push(diffEntry(semanticName, vals));
  }

  const swiftValues = collectSwiftValueSet(sources, mode);
  const orphans = collectJsxOrphans(sources, mode, swiftValues, wantCategory);

  return { map, drifts, orphans };
}

function matchesMode(tokenMode: RawToken["mode"], wanted: ReconcileOptions["mode"]): boolean {
  if (wanted === "dark") return tokenMode === "dark";
  // "any-or-light"
  return tokenMode === "any" || tokenMode === "light";
}

function diffEntry(
  semanticName: string,
  vals: { swift?: string; css?: string; jsx?: string },
): TokenDrift {
  const s = vals.swift;
  const c = vals.css;
  const j = vals.jsx;

  if (s && c && s !== c) {
    return {
      semanticName,
      swiftValue: s,
      cssValue: c,
      jsxValue: j,
      status: "swift-css-mismatch",
      note: `Swift (${s}) and CSS (${c}) disagree — investigate before trusting either`,
    };
  }

  if (s && j && s !== j) {
    return {
      semanticName,
      swiftValue: s,
      cssValue: c,
      jsxValue: j,
      status: "drift-jsx",
      note: `JSX value ${j} doesn't match Swift canonical ${s}`,
    };
  }

  if (!s && (c || j)) {
    return {
      semanticName,
      cssValue: c,
      jsxValue: j,
      status: "missing-swift",
      note: "No Swift token for this semantic — JSX/CSS introduced it independently",
    };
  }

  if (s && !c) {
    return {
      semanticName,
      swiftValue: s,
      jsxValue: j,
      status: "missing-css",
      note: "Swift token has no CSS counterpart",
    };
  }

  if (s && !j) {
    return {
      semanticName,
      swiftValue: s,
      cssValue: c,
      status: "missing-jsx",
      note: "JSX T object has no matching key (may be intentional)",
    };
  }

  return {
    semanticName,
    swiftValue: s,
    cssValue: c,
    jsxValue: j,
    status: "aligned",
    note: "All present sources agree",
  };
}

function collectSwiftValueSet(sources: TokenSource[], mode: ReconcileOptions["mode"]): Set<string> {
  const set = new Set<string>();
  for (const src of sources) {
    if (src.source !== "swift") continue;
    for (const tok of src.tokens) {
      if (!matchesMode(tok.mode, mode)) continue;
      set.add(normalizeValue(tok.value));
    }
  }
  return set;
}

function collectJsxOrphans(
  sources: TokenSource[],
  mode: ReconcileOptions["mode"],
  swiftValues: Set<string>,
  wantCategory: ReconcileOptions["category"],
): TokenOrphan[] {
  const orphans: TokenOrphan[] = [];
  for (const src of sources) {
    if (src.source !== "jsx") continue;
    for (const tok of src.tokens) {
      if (!matchesMode(tok.mode, mode)) continue;
      if (wantCategory && tok.category !== wantCategory) continue;
      const normalized = normalizeValue(tok.value);
      if (swiftValues.has(normalized)) continue;
      orphans.push({ value: normalized, sourceKey: tok.sourceName });
    }
  }
  return orphans;
}
