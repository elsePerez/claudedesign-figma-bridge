import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSwiftTokens } from "../../src/token-resolver/index.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/swift-colorsets",
);

describe("loadSwiftTokens · stoqio colorsets fixture (12 entries)", () => {
  const src = loadSwiftTokens(FIXTURE);

  it("returns a TokenSource with source='swift'", () => {
    expect(src.source).toBe("swift");
    expect(src.tokens.length).toBeGreaterThanOrEqual(12);
  });

  it("normalizes stoqio.primary → 'primary' with value #F54844", () => {
    const tok = src.tokens.find(t => t.semanticName === "primary" && t.mode === "any");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#F54844");
    expect(tok!.sourceName).toBe("stoqio.primary");
  });

  it("captures background as #FFFFFF (Swift canonical)", () => {
    const tok = src.tokens.find(t => t.semanticName === "background" && t.mode === "any");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#FFFFFF");
  });

  it("captures surface as #F5F5F5", () => {
    const tok = src.tokens.find(t => t.semanticName === "surface" && t.mode === "any");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#F5F5F5");
  });

  it("captures dark mode variant for background (#181A20)", () => {
    const tok = src.tokens.find(t => t.semanticName === "background" && t.mode === "dark");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#181A20");
  });

  it("primary exposes one 'any' entry plus a 'dark' appearance entry", () => {
    // stoqio.primary has two color entries in Contents.json: the default
    // (no `appearances` key → "any") and one tagged `dark`. The Swift loader
    // emits one RawToken per entry, so we expect both modes present.
    const primaries = src.tokens.filter(t => t.semanticName === "primary");
    expect(primaries.length).toBeGreaterThanOrEqual(2);
    const modes = primaries.map(t => t.mode);
    expect(modes).toContain("any");
    expect(modes).toContain("dark");
  });
});
