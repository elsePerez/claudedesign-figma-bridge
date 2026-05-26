import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  loadSnapshot,
  saveSnapshot,
  recordBuild,
  recordVerify,
  recordPromotion,
  type FigmaSnapshot,
} from "../../src/index.js";

describe("FigmaSnapshot · pure helpers", () => {
  it("loadSnapshot returns an empty snapshot when the file doesn't exist", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cdf-snap-a-"));
    const snap = loadSnapshot(path.join(tmp, "missing.json"), "abc123");
    expect(snap.version).toBe(1);
    expect(snap.fileKey).toBe("abc123");
    expect(snap.entries).toEqual({});
  });

  it("recordBuild creates a new snapshot object (immutable update)", () => {
    const before: FigmaSnapshot = {
      version: 1,
      fileKey: "x",
      updated: "2026-01-01T00:00:00Z",
      entries: {},
    };
    const after = recordBuild(before, "ScreenEmpty", {
      pageId: "6504:2",
      rootNodeId: "6505:2",
      status: "staging",
    });
    expect(before.entries.ScreenEmpty).toBeUndefined();
    expect(after.entries.ScreenEmpty).toBeDefined();
    expect(after.entries.ScreenEmpty!.pageId).toBe("6504:2");
    expect(after.entries.ScreenEmpty!.status).toBe("staging");
    expect(after.entries.ScreenEmpty!.lastBuilt).toBeDefined();
  });

  it("recordVerify upgrades staging → verified when verdict is ok", () => {
    let snap: FigmaSnapshot = {
      version: 1,
      fileKey: "x",
      updated: "",
      entries: {
        ScreenEmpty: {
          pageId: "6504:2",
          rootNodeId: "6505:2",
          status: "staging",
          lastBuilt: "2026-05-26T00:00:00Z",
        },
      },
    };
    snap = recordVerify(snap, "ScreenEmpty", { verdict: "ok", ratio: 0.001 });
    expect(snap.entries.ScreenEmpty!.status).toBe("verified");
    expect(snap.entries.ScreenEmpty!.lastVerify).toEqual({ verdict: "ok", ratio: 0.001 });
  });

  it("recordVerify keeps staging status when verdict is not ok", () => {
    let snap: FigmaSnapshot = {
      version: 1,
      fileKey: "x",
      updated: "",
      entries: {
        ScreenEmpty: {
          pageId: "p",
          rootNodeId: "n",
          status: "staging",
          lastBuilt: "now",
        },
      },
    };
    snap = recordVerify(snap, "ScreenEmpty", { verdict: "diff", ratio: 0.5 });
    expect(snap.entries.ScreenEmpty!.status).toBe("staging");
  });

  it("recordPromotion refuses to promote a non-verified entry", () => {
    const snap: FigmaSnapshot = {
      version: 1,
      fileKey: "x",
      updated: "",
      entries: {
        S: { pageId: "p", rootNodeId: "n", status: "staging", lastBuilt: "now" },
      },
    };
    expect(() => recordPromotion(snap, "S", "newPage", "newRoot")).toThrow(/Refusing to promote/);
  });

  it("recordPromotion moves a verified entry to its new page/node and status=promoted", () => {
    let snap: FigmaSnapshot = {
      version: 1,
      fileKey: "x",
      updated: "",
      entries: {
        S: { pageId: "p", rootNodeId: "n", status: "verified", lastBuilt: "now" },
      },
    };
    snap = recordPromotion(snap, "S", "canonicalPage", "canonicalRoot");
    expect(snap.entries.S!.status).toBe("promoted");
    expect(snap.entries.S!.pageId).toBe("canonicalPage");
    expect(snap.entries.S!.rootNodeId).toBe("canonicalRoot");
  });
});

describe("FigmaSnapshot · disk round-trip", () => {
  it("save then load preserves entries and sorts keys alphabetically", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cdf-snap-b-"));
    const filePath = path.join(tmp, "snap.json");

    let snap = loadSnapshot(filePath, "fileKey-1");
    snap = recordBuild(snap, "ZebraScreen", { pageId: "p1", rootNodeId: "n1", status: "staging" });
    snap = recordBuild(snap, "AlphaScreen", { pageId: "p2", rootNodeId: "n2", status: "staging" });
    saveSnapshot(filePath, snap);

    const reloaded = loadSnapshot(filePath);
    expect(reloaded.fileKey).toBe("fileKey-1");
    expect(Object.keys(reloaded.entries)).toEqual(["AlphaScreen", "ZebraScreen"]);
    expect(reloaded.entries.AlphaScreen!.pageId).toBe("p2");
    expect(reloaded.entries.ZebraScreen!.pageId).toBe("p1");

    const raw = fs.readFileSync(filePath, "utf-8");
    expect(raw.indexOf('"AlphaScreen"')).toBeLessThan(raw.indexOf('"ZebraScreen"'));
  });

  it("full lifecycle: build → verify → promote, then reload from disk", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cdf-snap-c-"));
    const filePath = path.join(tmp, "snap.json");

    let snap = loadSnapshot(filePath, "k");
    snap = recordBuild(snap, "ScreenEmpty", { pageId: "stg", rootNodeId: "r1", status: "staging" });
    snap = recordVerify(snap, "ScreenEmpty", { verdict: "ok", ratio: 0 });
    snap = recordPromotion(snap, "ScreenEmpty", "canon", "r2");
    saveSnapshot(filePath, snap);

    const reloaded = loadSnapshot(filePath);
    expect(reloaded.entries.ScreenEmpty!.status).toBe("promoted");
    expect(reloaded.entries.ScreenEmpty!.pageId).toBe("canon");
    expect(reloaded.entries.ScreenEmpty!.rootNodeId).toBe("r2");
  });
});
