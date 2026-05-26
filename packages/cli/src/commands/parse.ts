import { parseBundleFile, parseScreen } from "@cdf/core";

export interface ParseOptions {
  jsxPath: string;
  screen?: string;
  format?: "json" | "table";
}

export function runParse(options: ParseOptions): string {
  if (options.screen) {
    const tree = parseScreen(options.jsxPath, options.screen);
    if (!tree) throw new Error(`Screen "${options.screen}" not found in ${options.jsxPath}`);
    return JSON.stringify(tree, null, 2);
  }

  const result = parseBundleFile(options.jsxPath);

  if (options.format === "table") {
    const rows = result.artboards.map(a => `  ${a.wrapperTag.padEnd(12)} ${a.label.padEnd(50)} ${a.screenName.padEnd(28)} ${a.width}x${a.height}`);
    return [
      `Bundle: ${result.filePath}`,
      `Artboards: ${result.artboards.length}`,
      "",
      "  wrapper      label                                              screen                       size",
      "  -------      -----                                              ------                       ----",
      ...rows,
    ].join("\n");
  }

  return JSON.stringify(result, null, 2);
}
