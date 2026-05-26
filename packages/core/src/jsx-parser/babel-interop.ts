// @babel/traverse is a CJS module. Under Node ESM (vitest + "type":"module"),
// its default import may land on `.default` depending on the bundler.
// This file normalizes that so the rest of the codebase can
// `import { traverse } from "./babel-interop.js"` without the dance.

import _traverse from "@babel/traverse";

type TraverseFn = typeof _traverse;

const maybeDefault = (_traverse as unknown as { default?: TraverseFn }).default;
const fn: TraverseFn = maybeDefault ?? _traverse;

export const traverse = fn;
