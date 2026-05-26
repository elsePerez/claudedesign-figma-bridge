import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCssTokens } from "../../src/token-resolver/index.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/bundle-colors-and-type.css",
);

describe("loadCssTokens · bundle-colors-and-type.css", () => {
  const src = loadCssTokens(FIXTURE);

  it("returns a TokenSource with source='css'", () => {
    expect(src.source).toBe("css");
    expect(src.tokens.length).toBeGreaterThan(40);
  });

  it("normalizes --stoqio-primary → 'primary' with value #F54844", () => {
    const tok = src.tokens.find(t => t.semanticName === "primary" && t.mode === "light");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#F54844");
    expect(tok!.sourceName).toBe("--stoqio-primary");
    expect(tok!.category).toBe("color");
  });

  it("normalizes --on-surface-variant → 'onSurfaceVariant'", () => {
    const tok = src.tokens.find(t => t.semanticName === "onSurfaceVariant" && t.mode === "light");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#757575");
  });

  it("captures background-secondary as 'backgroundSecondary'", () => {
    const tok = src.tokens.find(t => t.semanticName === "backgroundSecondary" && t.mode === "light");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#FAFAFA");
  });

  it("detects dark mode variants for primary container", () => {
    const dark = src.tokens.find(t => t.semanticName === "primaryContainer" && t.mode === "dark");
    expect(dark).toBeDefined();
    expect(dark!.value).toBe("#2D0808");
  });

  it("infers spacing category for --space-md", () => {
    const tok = src.tokens.find(t => t.semanticName === "spaceMd");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("12px");
    expect(tok!.category).toBe("spacing");
  });

  it("infers radius category for --radius-lg", () => {
    const tok = src.tokens.find(t => t.semanticName === "radiusLg");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("20px");
    expect(tok!.category).toBe("radius");
  });
});
