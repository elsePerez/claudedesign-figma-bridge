// Parser for ClaudeDesign `colors_and_type.css`. Uses RegExp matching (NOT
// child_process) — `re.exec(body)` below is the RegExp.prototype.exec method.
import * as fs from "node:fs";
import { inferCategory, normalizeCssName, normalizeValue } from "./normalize-name.js";
import type { RawToken, TokenMode, TokenSource } from "./types.js";

/**
 * Parse a CSS file into a TokenSource. Walks top-level rule blocks,
 * captures `--name: value;` declarations, and assigns mode based on the
 * selector (`:root` → light, anything mentioning `dark` → dark).
 */
export function loadCssTokens(filePath: string): TokenSource {
  const src = fs.readFileSync(filePath, "utf-8");
  const blocks = parseRuleBlocks(src);
  const tokens: RawToken[] = [];

  for (const { selector, body } of blocks) {
    const mode = inferModeFromSelector(selector);
    for (const decl of parseCustomProperties(body)) {
      const semanticName = normalizeCssName(decl.name);
      const value = normalizeValue(decl.value);
      tokens.push({
        sourceName: `--${decl.name}`,
        semanticName,
        value,
        mode,
        category: inferCategory(semanticName, value),
      });
    }
  }

  return { source: "css", filePath, tokens };
}

interface RuleBlock {
  selector: string;
  body: string;
}

/**
 * Extract all top-level `SELECTOR { BODY }` blocks. Doesn't handle nested
 * blocks (the target CSS doesn't have any). Comments are stripped first.
 */
function parseRuleBlocks(css: string): RuleBlock[] {
  // strip block comments
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: RuleBlock[] = [];

  let i = 0;
  while (i < stripped.length) {
    const open = stripped.indexOf("{", i);
    if (open < 0) break;
    const close = stripped.indexOf("}", open);
    if (close < 0) break;
    const selector = stripped.slice(i, open).trim();
    const body = stripped.slice(open + 1, close);
    if (selector) blocks.push({ selector, body });
    i = close + 1;
  }
  return blocks;
}

interface CssDecl {
  name: string;
  value: string;
}

function parseCustomProperties(body: string): CssDecl[] {
  const decls: CssDecl[] = [];
  const re = /--([\w-]+)\s*:\s*([^;]+);/gs;
  let m: RegExpExecArray | null;
  m = re.exec(body);
  while (m !== null) {
    decls.push({ name: m[1]!, value: m[2]!.trim() });
    m = re.exec(body);
  }
  return decls;
}

function inferModeFromSelector(selector: string): TokenMode {
  if (/dark/i.test(selector)) return "dark";
  if (/:root/i.test(selector)) return "light";
  return "any";
}
