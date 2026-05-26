import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";

/**
 * Tiny static HTTP server that serves a ClaudeDesign bundle directory.
 *
 * Playwright blocks `file://` URLs for security; the bundles need to be
 * served over HTTP so the in-browser Babel transformer can fetch the .jsx
 * files. This server is minimal: it serves any file under the bundle root
 * with naive MIME-type guessing and rejects path traversal.
 */
export interface ServeHandle {
  url: string;
  port: number;
  close(): Promise<void>;
}

export async function serveBundle(bundleDir: string, port = 0): Promise<ServeHandle> {
  const root = path.resolve(bundleDir);
  if (!fs.existsSync(root)) throw new Error(`Bundle dir not found: ${root}`);

  const server = http.createServer((req, res) => handleRequest(root, req, res));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;

  return {
    url: `http://127.0.0.1:${actualPort}`,
    port: actualPort,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
      }),
  };
}

function handleRequest(root: string, req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.resolve(root, "." + pathname);
  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    res.end("forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeFor(filePath));
  res.end(fs.readFileSync(filePath));
}

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".jsx":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
