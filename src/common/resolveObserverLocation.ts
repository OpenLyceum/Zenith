/**
 * resolveObserverLocation.ts
 *
 * Best-effort "where am I" for the observer-location controls, via the browser
 * Geolocation API (GPS / Wi-Fi / cell; asks the user once). There is deliberately
 * no third-party IP-lookup fallback: the sim's CSP `connect-src` is `'self' blob:`,
 * and sending the learner's IP to an outside service is not worth the coarse
 * answer. When geolocation is unavailable, blocked by policy, denied, or fails,
 * the promise rejects and the learner sets latitude / longitude manually.
 *
 * Do not call `getCurrentPosition` when Permissions-Policy would block it:
 * Chromium logs that as console.error, which Playwright fuzz treats as failure.
 *
 * Approximate accuracy is intentional: we only need the observer's rough place on
 * Earth, so `enableHighAccuracy` stays off to keep the request fast and unintrusive.
 */

export type ResolvedLocation = {
  latitudeDeg: number;
  longitudeDeg: number;
};

type FeaturePolicyQuery = {
  allowsFeature: (feature: string) => boolean;
};

/** `document.permissionsPolicy` (current) or `document.featurePolicy` (legacy). */
const documentFeaturePolicy = (): FeaturePolicyQuery | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const candidate = document as Document & {
    permissionsPolicy?: FeaturePolicyQuery;
    featurePolicy?: FeaturePolicyQuery;
  };
  const policy = candidate.permissionsPolicy ?? candidate.featurePolicy;
  return policy && typeof policy.allowsFeature === "function" ? policy : null;
};

/**
 * Whether `navigator.geolocation.getCurrentPosition` can be called without a
 * Chromium Permissions-Policy console.error. Missing policy APIs are treated as
 * allowed so capable browsers still get a prompt.
 */
const isGeolocationCallable = (): boolean => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return false;
  }
  const policy = documentFeaturePolicy();
  if (!policy) {
    return true;
  }
  try {
    return policy.allowsFeature("geolocation");
  } catch {
    return false;
  }
};

/** Resolves the observer's approximate location, or rejects if geolocation can't answer. */
export const resolveObserverLocation = (): Promise<ResolvedLocation> =>
  new Promise<ResolvedLocation>((resolve, reject) => {
    if (!isGeolocationCallable()) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitudeDeg: position.coords.latitude,
            longitudeDeg: position.coords.longitude,
          }),
        reject,
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
      );
    } catch (error) {
      reject(error);
    }
  });
