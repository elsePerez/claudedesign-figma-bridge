import { buildIntentFromBundle } from "@cdf/core";

export interface PlanOptions {
  jsxPath: string;
  screen: string;
  label?: string;
  cssPath?: string;
  swiftDir?: string;
}

export function runPlan(options: PlanOptions): string {
  const intent = buildIntentFromBundle({
    jsxPath: options.jsxPath,
    screenName: options.screen,
    label: options.label ?? options.screen,
    cssPath: options.cssPath,
    swiftColorsetsDir: options.swiftDir,
  });
  return JSON.stringify(intent, null, 2);
}
