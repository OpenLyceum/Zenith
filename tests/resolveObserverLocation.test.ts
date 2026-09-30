/**
 * resolveObserverLocation.test.ts
 *
 * "Use my location" relies on browser geolocation only — no cross-origin fetch,
 * which the sim's CSP connect-src would refuse (a console.error that Playwright
 * ?fuzz treats as failure).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveObserverLocation } from "../src/common/resolveObserverLocation.js";

describe("resolveObserverLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects without fetching when geolocation is unavailable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { geolocation: undefined });

    await expect(resolveObserverLocation()).rejects.toThrow(/Geolocation unavailable/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves device coordinates", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: (p: { coords: { latitude: number; longitude: number } }) => void) =>
          success({ coords: { latitude: 45.5, longitude: -73.6 } }),
      },
    });

    await expect(resolveObserverLocation()).resolves.toEqual({ latitudeDeg: 45.5, longitudeDeg: -73.6 });
  });

  it("rejects without fetching when geolocation fails", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const error = { code: 2, PERMISSION_DENIED: 1, message: "unavailable" };
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_success: unknown, failure: (e: typeof error) => void) => failure(error),
      },
    });

    await expect(resolveObserverLocation()).rejects.toBe(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
