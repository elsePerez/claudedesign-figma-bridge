import * as fs from "node:fs";
import { emitUseFigma } from "@cdf/figma-script";
import type { IntentArtboard } from "@cdf/core";

export interface EmitOptions {
  intentPath: string;
  pageId: string;
  originX?: number;
  originY?: number;
}

export function runEmit(options: EmitOptions): string {
  const raw = fs.readFileSync(options.intentPath, "utf-8");
  const intent = JSON.parse(raw) as IntentArtboard;
  return emitUseFigma(intent, {
    pageId: options.pageId,
    origin: { x: options.originX ?? 100, y: options.originY ?? 100 },
  });
}
