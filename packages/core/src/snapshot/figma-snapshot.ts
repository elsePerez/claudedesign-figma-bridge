import * as fs from "node:fs";

/**
 * Persistent record of which Screen lives at which Figma page/node id.
 * Mirrors the spirit of ClaudeDesign's `.registry-snapshot.json` but tracks
 * Figma destinations instead of registry assets.
 */
export interface FigmaSnapshot {
  version: 1;
  /** Figma file key the snapshot is for. */
  fileKey: string;
  /** When the snapshot was last written (ISO 8601 string). */
  updated: string;
  /** Screen name → { pageId, rootNodeId, status, lastBuilt }. */
  entries: Record<string, FigmaSnapshotEntry>;
}

export interface FigmaSnapshotEntry {
  /** Figma page id where the screen currently lives. */
  pageId: string;
  /** Figma node id of the root frame for this screen. */
  rootNodeId: string;
  /** Lifecycle stage. "staging" = built but not verified; "verified" = passed visual + structural diff; "promoted" = on the canonical page. */
  status: "staging" | "verified" | "promoted";
  /** Last build timestamp (ISO 8601). */
  lastBuilt: string;
  /** Last verify result, if any. */
  lastVerify?: { verdict: string; ratio?: number };
}

const EMPTY: FigmaSnapshot = {
  version: 1,
  fileKey: "",
  updated: new Date(0).toISOString(),
  entries: {},
};

/** Read a snapshot from disk, or return an empty snapshot if the file doesn't exist. */
export function loadSnapshot(filePath: string, fallbackFileKey = ""): FigmaSnapshot {
  if (!fs.existsSync(filePath)) {
    return { ...EMPTY, fileKey: fallbackFileKey, updated: new Date().toISOString() };
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as FigmaSnapshot;
  if (raw.version !== 1) {
    throw new Error(`Unsupported snapshot version: ${raw.version}`);
  }
  return raw;
}

/** Persist a snapshot to disk with pretty-printed JSON. */
export function saveSnapshot(filePath: string, snap: FigmaSnapshot): void {
  const sorted: FigmaSnapshot = {
    ...snap,
    updated: new Date().toISOString(),
    entries: sortKeys(snap.entries),
  };
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

/** Record (or update) a build entry. Returns a NEW snapshot object — never mutates input. */
export function recordBuild(
  snap: FigmaSnapshot,
  screen: string,
  entry: Omit<FigmaSnapshotEntry, "lastBuilt">,
): FigmaSnapshot {
  const next: FigmaSnapshot = {
    ...snap,
    entries: {
      ...snap.entries,
      [screen]: {
        ...entry,
        lastBuilt: new Date().toISOString(),
      },
    },
  };
  return next;
}

/** Update verify result for an entry. Returns a new snapshot. */
export function recordVerify(
  snap: FigmaSnapshot,
  screen: string,
  verify: { verdict: string; ratio?: number },
): FigmaSnapshot {
  const existing = snap.entries[screen];
  if (!existing) throw new Error(`Cannot record verify for unknown screen: ${screen}`);
  const newStatus: FigmaSnapshotEntry["status"] = verify.verdict === "ok" ? "verified" : existing.status;
  return {
    ...snap,
    entries: {
      ...snap.entries,
      [screen]: { ...existing, status: newStatus, lastVerify: verify },
    },
  };
}

/** Mark an entry as promoted (moved to canonical page). */
export function recordPromotion(
  snap: FigmaSnapshot,
  screen: string,
  newPageId: string,
  newRootNodeId: string,
): FigmaSnapshot {
  const existing = snap.entries[screen];
  if (!existing) throw new Error(`Cannot promote unknown screen: ${screen}`);
  if (existing.status !== "verified") {
    throw new Error(`Refusing to promote unverified screen "${screen}" (status=${existing.status})`);
  }
  return {
    ...snap,
    entries: {
      ...snap.entries,
      [screen]: {
        ...existing,
        pageId: newPageId,
        rootNodeId: newRootNodeId,
        status: "promoted",
      },
    },
  };
}

function sortKeys<T>(obj: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k]!;
  return out;
}
