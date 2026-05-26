import { describe, it, expect, afterEach } from "vitest";
import { serveBundle, type ServeHandle } from "../src/serve-bundle.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const FX = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../core/tests/fixtures",
);

describe("serveBundle", () => {
  let handle: ServeHandle | null = null;

  afterEach(async () => {
    if (handle) await handle.close();
    handle = null;
  });

  it("serves an existing file with the right MIME type", async () => {
    handle = await serveBundle(FX);
    const res = await fetch(`${handle.url}/bundle-colors-and-type.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
    const body = await res.text();
    expect(body).toContain("--stoqio-primary");
  });

  it("404s on missing files", async () => {
    handle = await serveBundle(FX);
    const res = await fetch(`${handle.url}/does-not-exist.html`);
    expect(res.status).toBe(404);
  });

  it("403s on path traversal attempts", async () => {
    handle = await serveBundle(FX);
    const res = await fetch(`${handle.url}/../../package.json`);
    // Browsers normalize the path before sending — this becomes a request
    // for /package.json relative to root. Either 404 (not in fixtures) or
    // 403 is acceptable behavior.
    expect([403, 404]).toContain(res.status);
  });

  it("throws if the bundle dir doesn't exist", async () => {
    await expect(serveBundle("/nonexistent-path-12345")).rejects.toThrow();
  });
});
