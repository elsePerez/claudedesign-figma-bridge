import * as t from "@babel/types";
import { parseJsxFile } from "../jsx-parser/parse-jsx-file.js";
import { traverse } from "../jsx-parser/babel-interop.js";
import { inferCategory, normalizeJsxKey, normalizeValue } from "./normalize-name.js";
import type { RawToken, TokenSource } from "./types.js";

export interface LoadJsxTokensOptions {
  /** Name of the const object to extract. Default: "T". */
  varName?: string;
}

/**
 * Find `const <varName> = { key: 'value', ... }` at module scope in a JSX
 * file and emit its entries as tokens. Only string-literal values are
 * captured — computed expressions are skipped (Phase 2 v1).
 */
export function loadJsxTokens(filePath: string, options: LoadJsxTokensOptions = {}): TokenSource {
  const varName = options.varName ?? "T";
  const ast = parseJsxFile(filePath);
  const tokens: RawToken[] = [];

  traverse(ast, {
    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id) || path.node.id.name !== varName) return;
      const init = path.node.init;
      if (!t.isObjectExpression(init)) return;

      for (const prop of init.properties) {
        if (!t.isObjectProperty(prop)) continue;
        if (!t.isIdentifier(prop.key)) continue;
        const key = prop.key.name;
        const literal = readStringLiteral(prop.value);
        if (literal === null) continue;
        const semanticName = normalizeJsxKey(key);
        const value = normalizeValue(literal);
        tokens.push({
          sourceName: key,
          semanticName,
          value,
          mode: "any",
          category: inferCategory(semanticName, value),
        });
      }
    },
  });

  return { source: "jsx", filePath, tokens };
}

function readStringLiteral(node: t.Node): string | null {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isTemplateLiteral(node) && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0]?.value.cooked ?? null;
  }
  return null;
}
