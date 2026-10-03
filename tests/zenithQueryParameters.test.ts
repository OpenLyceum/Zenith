/**
 * zenithQueryParameters.test.ts
 *
 * Covers civil-date parsing helpers used by teacher deep-link query params.
 */

import { describe, expect, it } from "vitest";
import {
  isValidCivilDateQueryParam,
  parseCivilDateQueryParam,
  resolveCivilTimeMsFromQuery,
} from "../src/preferences/zenithQueryParameters.js";
import { CIVIL_TIME_MS_RANGE, DEFAULT_CIVIL_TIME_MS } from "../src/ZenithConstants.js";

describe("zenithQueryParameters date helpers", () => {
  it("treats empty or null date as the sim default civil epoch", () => {
    expect(isValidCivilDateQueryParam("")).toBe(true);
    expect(isValidCivilDateQueryParam(null)).toBe(true);
    expect(parseCivilDateQueryParam("")).toBeNull();
    expect(parseCivilDateQueryParam(null)).toBeNull();
    expect(resolveCivilTimeMsFromQuery("")).toBe(DEFAULT_CIVIL_TIME_MS);
    expect(resolveCivilTimeMsFromQuery(null)).toBe(DEFAULT_CIVIL_TIME_MS);
  });

  it("accepts ISO-8601 civil timestamps", () => {
    const iso = "2024-12-21T10:00:00Z";
    expect(isValidCivilDateQueryParam(iso)).toBe(true);
    expect(parseCivilDateQueryParam(iso)).toBe(Date.parse(iso));
    expect(resolveCivilTimeMsFromQuery(iso)).toBe(Date.UTC(2024, 11, 21, 10, 0, 0));
  });

  it("accepts an explicit numeric UTC offset", () => {
    for (const timestamp of ["2024-12-21T05:00:00-05:00", "2024-12-21T05:00:00-0500"]) {
      expect(isValidCivilDateQueryParam(timestamp)).toBe(true);
      expect(parseCivilDateQueryParam(timestamp)).toBe(Date.UTC(2024, 11, 21, 10));
    }
  });

  it("accepts a date-only value as UTC midnight", () => {
    expect(isValidCivilDateQueryParam("2024-12-21")).toBe(true);
    expect(parseCivilDateQueryParam("2024-12-21")).toBe(Date.UTC(2024, 11, 21));
  });

  it("rejects timestamps without an explicit UTC offset", () => {
    for (const timestamp of ["2024-12-21T10:00:00", "2024-12-21T10:00", "2024-12-21T10:00:00 UTC"]) {
      expect(isValidCivilDateQueryParam(timestamp)).toBe(false);
      expect(parseCivilDateQueryParam(timestamp)).toBeNull();
      expect(resolveCivilTimeMsFromQuery(timestamp)).toBe(DEFAULT_CIVIL_TIME_MS);
    }
  });

  it("rejects unparseable date strings", () => {
    expect(isValidCivilDateQueryParam("not-a-date")).toBe(false);
    expect(parseCivilDateQueryParam("not-a-date")).toBeNull();
  });

  it("rejects parseable dates outside the supported civil year range", () => {
    // Accepting these would let the date-jump spinners clamp them to the range
    // boundary, so a shared link would silently render a different sky.
    for (const outOfRange of ["1850-01-01T00:00:00Z", "2150-06-01T00:00:00Z"]) {
      expect(isValidCivilDateQueryParam(outOfRange)).toBe(false);
      expect(parseCivilDateQueryParam(outOfRange)).toBeNull();
      expect(resolveCivilTimeMsFromQuery(outOfRange)).toBe(DEFAULT_CIVIL_TIME_MS);
    }
  });

  it("accepts dates at both ends of the supported range", () => {
    for (const ms of [CIVIL_TIME_MS_RANGE.min, CIVIL_TIME_MS_RANGE.max]) {
      const iso = new Date(ms).toISOString();
      expect(isValidCivilDateQueryParam(iso)).toBe(true);
      expect(resolveCivilTimeMsFromQuery(iso)).toBe(ms);
    }
  });
});
