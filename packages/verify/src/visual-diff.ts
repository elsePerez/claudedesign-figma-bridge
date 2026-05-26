import * as fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export interface VisualDiffOptions {
  /** Reference PNG path (typically the Playwright-rendered HTML). */
  referencePath: string;
  /** Candidate PNG path (typically the Figma node screenshot). */
  candidatePath: string;
  /** Optional path to write a diff PNG (red overlay on mismatched pixels). */
  diffOutputPath?: string;
  /** Per-pixel tolerance threshold (0 strict … 1 permissive). Default 0.1. */
  threshold?: number;
}

export interface VisualDiffResult {
  /** Width × height the diff was performed at (the smaller of the two PNGs). */
  width: number;
  height: number;
  /** Total pixels examined. */
  totalPixels: number;
  /** Pixels that differed beyond `threshold`. */
  mismatchedPixels: number;
  /** mismatchedPixels / totalPixels, in [0..1]. */
  ratio: number;
  /** Final verdict: "ok" if ratio <= maxRatio, else "diff". */
  verdict: "ok" | "diff" | "size-mismatch";
  /** True if the two PNGs had different dimensions (auto-cropped before diff). */
  sizeMismatch: boolean;
  /** Reference size, for debugging. */
  referenceSize: { width: number; height: number };
  candidateSize: { width: number; height: number };
  /** If `diffOutputPath` was supplied, the path that was written. */
  diffOutputPath?: string;
}

export interface VerifyVisualOptions extends VisualDiffOptions {
  /** Max ratio allowed before verdict flips to "diff". Default 0.01 (1%). */
  maxRatio?: number;
}

/**
 * Pixel-diff two PNGs and (optionally) write a visual diff overlay.
 *
 * If the two images have different sizes, both are cropped to the smaller
 * common rectangle and a `sizeMismatch: true` flag is set. The verdict is
 * "size-mismatch" in that case regardless of ratio.
 */
export function diffImages(options: VerifyVisualOptions): VisualDiffResult {
  const threshold = options.threshold ?? 0.1;
  const maxRatio = options.maxRatio ?? 0.01;

  const refPng = PNG.sync.read(fs.readFileSync(options.referencePath));
  const candPng = PNG.sync.read(fs.readFileSync(options.candidatePath));

  const referenceSize = { width: refPng.width, height: refPng.height };
  const candidateSize = { width: candPng.width, height: candPng.height };
  const sizeMismatch = refPng.width !== candPng.width || refPng.height !== candPng.height;

  const w = Math.min(refPng.width, candPng.width);
  const h = Math.min(refPng.height, candPng.height);

  const a = cropToRgba(refPng, w, h);
  const b = cropToRgba(candPng, w, h);
  const out = new PNG({ width: w, height: h });

  const mismatched = pixelmatch(a, b, out.data, w, h, { threshold });

  if (options.diffOutputPath) {
    fs.writeFileSync(options.diffOutputPath, PNG.sync.write(out));
  }

  const totalPixels = w * h;
  const ratio = totalPixels === 0 ? 0 : mismatched / totalPixels;
  const verdict: VisualDiffResult["verdict"] = sizeMismatch
    ? "size-mismatch"
    : ratio <= maxRatio
      ? "ok"
      : "diff";

  return {
    width: w,
    height: h,
    totalPixels,
    mismatchedPixels: mismatched,
    ratio,
    verdict,
    sizeMismatch,
    referenceSize,
    candidateSize,
    diffOutputPath: options.diffOutputPath,
  };
}

/** Re-pack a PNG buffer to RGBA8 at the target width/height (top-left crop). */
function cropToRgba(png: PNG, w: number, h: number): Buffer {
  if (png.width === w && png.height === h) return png.data;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = (y * png.width) * 4;
    const dstStart = (y * w) * 4;
    png.data.copy(out, dstStart, srcStart, srcStart + w * 4);
  }
  return out;
}
