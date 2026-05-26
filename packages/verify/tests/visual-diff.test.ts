import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { diffImages } from "../src/index.js";

function writePng(p: string, w: number, h: number, color: [number, number, number, number]): void {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      png.data[i] = color[0];
      png.data[i + 1] = color[1];
      png.data[i + 2] = color[2];
      png.data[i + 3] = color[3];
    }
  }
  fs.writeFileSync(p, PNG.sync.write(png));
}

describe("diffImages", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cdf-verify-"));

  it("returns verdict='ok' for identical images", () => {
    const a = path.join(tmp, "a.png");
    const b = path.join(tmp, "b.png");
    writePng(a, 50, 50, [255, 0, 0, 255]);
    writePng(b, 50, 50, [255, 0, 0, 255]);
    const r = diffImages({ referencePath: a, candidatePath: b });
    expect(r.verdict).toBe("ok");
    expect(r.mismatchedPixels).toBe(0);
    expect(r.ratio).toBe(0);
  });

  it("returns verdict='diff' for very different images", () => {
    const a = path.join(tmp, "red.png");
    const b = path.join(tmp, "blue.png");
    writePng(a, 50, 50, [255, 0, 0, 255]);
    writePng(b, 50, 50, [0, 0, 255, 255]);
    const r = diffImages({ referencePath: a, candidatePath: b, maxRatio: 0.01 });
    expect(r.verdict).toBe("diff");
    expect(r.ratio).toBeGreaterThan(0.5);
  });

  it("returns verdict='size-mismatch' when dimensions differ", () => {
    const a = path.join(tmp, "small.png");
    const b = path.join(tmp, "large.png");
    writePng(a, 30, 30, [255, 255, 255, 255]);
    writePng(b, 50, 50, [255, 255, 255, 255]);
    const r = diffImages({ referencePath: a, candidatePath: b });
    expect(r.verdict).toBe("size-mismatch");
    expect(r.sizeMismatch).toBe(true);
    expect(r.referenceSize).toEqual({ width: 30, height: 30 });
    expect(r.candidateSize).toEqual({ width: 50, height: 50 });
  });

  it("writes a diff PNG when diffOutputPath is given", () => {
    const a = path.join(tmp, "a2.png");
    const b = path.join(tmp, "b2.png");
    const out = path.join(tmp, "diff.png");
    writePng(a, 20, 20, [255, 0, 0, 255]);
    writePng(b, 20, 20, [0, 255, 0, 255]);
    diffImages({ referencePath: a, candidatePath: b, diffOutputPath: out });
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.statSync(out).size).toBeGreaterThan(0);
  });
});
