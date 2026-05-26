import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJsxTokens } from "../../src/token-resolver/index.js";

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/lista-screen.jsx",
);

describe("loadJsxTokens · lista-screen.jsx T object", () => {
  const src = loadJsxTokens(FIXTURE);

  it("returns a TokenSource with source='jsx'", () => {
    expect(src.source).toBe("jsx");
    expect(src.tokens.length).toBeGreaterThan(0);
  });

  it("aliases T.bg → semantic 'background' with value #FAFAFA", () => {
    const tok = src.tokens.find(t => t.semanticName === "background");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#FAFAFA");
    expect(tok!.sourceName).toBe("bg");
  });

  it("captures T.surface = #FFFFFF (the JSX-vs-Swift drift case)", () => {
    const tok = src.tokens.find(t => t.semanticName === "surface");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#FFFFFF");
  });

  it("captures T.surfaceVariant = #F5F5F5", () => {
    const tok = src.tokens.find(t => t.semanticName === "surfaceVariant");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#F5F5F5");
  });

  it("captures T.outlineVariant = rgba(33,33,33,.06) (alpha shortcut drift)", () => {
    const tok = src.tokens.find(t => t.semanticName === "outlineVariant");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("rgba(33,33,33,.06)");
  });

  it("captures T.primary = #F54844 (aligned with Swift)", () => {
    const tok = src.tokens.find(t => t.semanticName === "primary");
    expect(tok).toBeDefined();
    expect(tok!.value).toBe("#F54844");
  });

  it("does not extract from a different var name when default 'T' is used", () => {
    // If we change varName option to something not present, expect empty
    const empty = loadJsxTokens(FIXTURE, { varName: "ZZZ_NotPresent" });
    expect(empty.tokens).toHaveLength(0);
  });
});
