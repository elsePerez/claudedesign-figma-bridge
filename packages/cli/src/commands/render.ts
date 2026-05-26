import { renderArtboard } from "@cdf/playwright-renderer";

export interface RenderOptions {
  bundleDir: string;
  htmlFile: string;
  artboardLabel: string;
  outputPath: string;
}

export async function runRender(options: RenderOptions): Promise<string> {
  const result = await renderArtboard(options);
  return `Rendered ${options.artboardLabel} → ${result.outputPath} (${result.rect.width}×${result.rect.height})`;
}
