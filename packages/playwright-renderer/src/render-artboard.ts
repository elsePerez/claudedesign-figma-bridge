import * as path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { serveBundle, type ServeHandle } from "./serve-bundle.js";

export interface RenderArtboardOptions {
  /** Absolute path to the ClaudeDesign bundle directory. */
  bundleDir: string;
  /** HTML file name within the bundle (e.g. "Lista (Fase 2).html"). */
  htmlFile: string;
  /** Artboard label text — used to locate the phone frame in the rendered canvas. */
  artboardLabel: string;
  /** Output PNG absolute path. */
  outputPath: string;
  /** Optional: max ms to wait for Babel to finish compiling the JSX. Default 5000. */
  babelWaitMs?: number;
  /** Optional: viewport size for the canvas page. Default 2000x4000. */
  viewport?: { width: number; height: number };
}

export interface RenderArtboardResult {
  outputPath: string;
  rect: { x: number; y: number; width: number; height: number };
}

/**
 * Render a specific Artboard from a ClaudeDesign HTML file via Playwright.
 *
 *   1. Boots a local HTTP server in the bundle dir (Playwright blocks file://).
 *   2. Opens the HTML in headless Chromium.
 *   3. Waits for the in-browser Babel runtime to compile the JSX.
 *   4. Locates the Artboard by its label text (the layout wrapper renders a
 *      label div next to each phone frame).
 *   5. Screenshots the sibling element (the phone frame, e.g. 402x874).
 */
export async function renderArtboard(options: RenderArtboardOptions): Promise<RenderArtboardResult> {
  const viewport = options.viewport ?? { width: 2000, height: 4000 };
  const babelWaitMs = options.babelWaitMs ?? 5000;
  const handle: ServeHandle = await serveBundle(options.bundleDir);
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch();
    const page: Page = await browser.newPage({ viewport });
    const url = `${handle.url}/${encodeURIComponent(options.htmlFile)}`;
    await page.goto(url, { waitUntil: "load" });

    // Wait until React has mounted SOMETHING and the label is present.
    await page.waitForFunction(
      (label: string) => {
        const root = document.getElementById("root");
        if (!root || root.children.length === 0) return false;
        return [...document.querySelectorAll("div")].some(
          d => d.textContent?.trim() === label,
        );
      },
      options.artboardLabel,
      { timeout: babelWaitMs },
    );

    // Locate the phone frame: the next sibling of the label div.
    const rect = await page.evaluate((label: string) => {
      const labels = [...document.querySelectorAll("div")].filter(
        d => d.textContent?.trim() === label,
      );
      const lbl = labels[0];
      if (!lbl) return null;
      const phone = lbl.nextElementSibling as HTMLElement | null;
      if (!phone) return null;
      phone.id = "__cdf_target__";
      const r = phone.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
    }, options.artboardLabel);

    if (!rect) throw new Error(`Artboard label not found: "${options.artboardLabel}"`);

    const locator = page.locator("#__cdf_target__");
    await locator.screenshot({ path: path.resolve(options.outputPath), type: "png" });

    return { outputPath: options.outputPath, rect };
  } finally {
    if (browser) await browser.close();
    await handle.close();
  }
}
