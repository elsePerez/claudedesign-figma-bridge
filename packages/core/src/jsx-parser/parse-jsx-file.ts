import { parse } from "@babel/parser";
import type { File } from "@babel/types";
import * as fs from "node:fs";

/**
 * Parse a ClaudeDesign .jsx file into a Babel AST.
 *
 * The .jsx files in ClaudeDesign bundles are React source loaded by
 * <script type="text/babel"> in the browser. They use ESM-ish syntax
 * (top-level const/function, no imports — React is on the global).
 * We enable JSX parsing and tolerate errors so missing-import-style
 * issues don't abort.
 */
export function parseJsxFile(filePath: string): File {
  const source = fs.readFileSync(filePath, "utf-8");
  return parse(source, {
    sourceType: "module",
    plugins: ["jsx"],
    errorRecovery: true,
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
  });
}
