import { loadCssTokens, loadJsxTokens, loadSwiftTokens, reconcile } from "@cdf/core";
import type { TokenSource } from "@cdf/core";

export interface TokensOptions {
  jsxPath?: string;
  cssPath?: string;
  swiftDir?: string;
  format?: "json" | "table";
}

export function runTokens(options: TokensOptions): string {
  const sources: TokenSource[] = [];
  if (options.swiftDir) sources.push(loadSwiftTokens(options.swiftDir));
  if (options.cssPath) sources.push(loadCssTokens(options.cssPath));
  if (options.jsxPath) sources.push(loadJsxTokens(options.jsxPath));

  const result = reconcile(sources, { category: "color" });

  if (options.format === "table") {
    const lines = [
      "semantic                Swift           CSS             JSX             status",
      "--------                -----           ---             ---             ------",
    ];
    for (const d of result.drifts) {
      lines.push(
        [
          d.semanticName.padEnd(24),
          (d.swiftValue ?? "—").padEnd(16),
          (d.cssValue ?? "—").padEnd(16),
          (d.jsxValue ?? "—").padEnd(16),
          d.status,
        ].join(""),
      );
    }
    lines.push("");
    lines.push(`Orphan JSX values (no Swift match): ${result.orphans.length}`);
    for (const o of result.orphans) {
      lines.push(`  ${o.value}   (T.${o.sourceKey})`);
    }
    return lines.join("\n");
  }

  return JSON.stringify(result, null, 2);
}
