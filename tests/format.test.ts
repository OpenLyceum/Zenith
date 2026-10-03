/**
 * format.test.ts
 *
 * Pins the shared readout formatters so a precision change is intentional.
 */

import { describe, expect, it } from "vitest";
import { formatDeg, formatDuration, formatHours, formatMag } from "../src/common/format.js";

describe("formatHours", () => {
  it("rounds to two decimals", () => {
    expect(formatHours(1.236)).toBe("1.24");
    expect(formatHours(5)).toBe("5.00");
  });
});

describe("formatDeg", () => {
  it("rounds to one decimal", () => {
    expect(formatDeg(12.34)).toBe("12.3");
    expect(formatDeg(-0.05)).toBe("-0.1");
  });
});

describe("formatMag", () => {
  it("rounds to two decimals", () => {
    expect(formatMag(-1.5)).toBe("-1.50");
    expect(formatMag(0.004)).toBe("0.00");
  });
});

describe("formatDuration", () => {
  const hourPattern = "{{value}}h";
  const minutePattern = "{{value}}m";

  it("formats hours and minutes", () => {
    expect(formatDuration(2.5, hourPattern, minutePattern)).toBe("2h 30m");
    expect(formatDuration(0.75, hourPattern, minutePattern)).toBe("45m");
  });

  it("clamps negative inputs to zero", () => {
    expect(formatDuration(-1, hourPattern, minutePattern)).toBe("0m");
  });

  it("rounds to the nearest minute", () => {
    expect(formatDuration(1 / 60 + 0.001, hourPattern, minutePattern)).toBe("1m");
  });

  it("uses the supplied locale unit patterns", () => {
    expect(formatDuration(2.5, "{{value}} h", "{{value}} min")).toBe("2 h 30 min");
  });
});
