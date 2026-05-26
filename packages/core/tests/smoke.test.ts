import { describe, it, expect } from "vitest";
import { VERSION } from "../src/index.js";

describe("@cdf/core smoke", () => {
  it("exports a VERSION string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION).toBe("0.0.0");
  });
});
