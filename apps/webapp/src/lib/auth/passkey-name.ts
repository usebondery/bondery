export type PasskeyNameParts = {
  browser: string | null;
  os: string | null;
};

type NavigatorBrands = ReadonlyArray<{ brand: string }>;

/** Chromium GREASE brands: `Not` + punctuation + `A` + punctuation + `Brand`. */
const CHROMIUM_GREASE_BRAND = /^Not\W+A\W+Brand$/i;

/**
 * Best-effort `{browser} on {os}` label. Used as the 3rd naming fallback after
 * the community AAGUID catalog and Better Auth authenticator names. Apple often
 * reports an empty AAGUID, so this UA path still matters.
 */
export function inferPasskeyNameParts(
  userAgent: string,
  hints?: { brands?: NavigatorBrands; platform?: string },
): PasskeyNameParts {
  return {
    browser: inferBrowser(userAgent, hints?.brands),
    os: inferOs(userAgent, hints?.platform),
  };
}

export function formatPasskeyName(
  parts: PasskeyNameParts,
  fallback: string,
  template: (values: { browser: string; os: string }) => string,
): string {
  if (parts.browser && parts.os) {
    return template({ browser: parts.browser, os: parts.os });
  }

  return parts.browser ?? parts.os ?? fallback;
}

type NavigatorUserAgentData = {
  brands?: NavigatorBrands;
  getHighEntropyValues?: (hints: string[]) => Promise<{ platform?: string }>;
};

/**
 * Resolves the UA fallback label from the current browser. Falls back to the
 * translated "Passkey" string when UA hints are missing (common on Apple).
 */
export async function resolveDefaultPasskeyName(
  fallback: string,
  template: (values: { browser: string; os: string }) => string,
): Promise<string> {
  if (typeof navigator === "undefined") {
    return fallback;
  }

  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUserAgentData })
    .userAgentData;
  let brands = uaData?.brands;
  let platform: string | undefined;

  if (uaData?.getHighEntropyValues) {
    try {
      const values = await uaData.getHighEntropyValues(["platform"]);
      platform = values.platform;
    } catch {
      brands = uaData.brands;
    }
  }

  return formatPasskeyName(
    inferPasskeyNameParts(navigator.userAgent, { brands, platform }),
    fallback,
    template,
  );
}

function isIgnoredUserAgentBrand(brand: string): boolean {
  return brand === "Chromium" || CHROMIUM_GREASE_BRAND.test(brand);
}

function inferBrowser(userAgent: string, brands?: NavigatorBrands) {
  const highEntropy = brands?.find((entry) => !isIgnoredUserAgentBrand(entry.brand));
  if (highEntropy?.brand) {
    return shortenBrowserBrand(highEntropy.brand);
  }

  if (/Edg\//i.test(userAgent)) {
    return "Edge";
  }
  if (/OPR\/|Opera\//i.test(userAgent)) {
    return "Opera";
  }
  if (/Firefox\//i.test(userAgent)) {
    return "Firefox";
  }
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
    return "Chrome";
  }
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    return "Safari";
  }

  return null;
}

function inferOs(userAgent: string, platform?: string): string | null {
  const platformMap: Record<string, string> = {
    Android: "Android",
    "Chrome OS": "Chrome OS",
    iOS: "iOS",
    Linux: "Linux",
    macOS: "macOS",
    Windows: "Windows",
  };

  if (platform && platformMap[platform]) {
    return platformMap[platform];
  }

  if (/Windows NT/i.test(userAgent)) {
    return "Windows";
  }
  if (/CrOS/i.test(userAgent)) {
    return "Chrome OS";
  }
  if (/Android/i.test(userAgent)) {
    return "Android";
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "iOS";
  }
  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return "macOS";
  }
  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return null;
}

function shortenBrowserBrand(brand: string): string {
  if (/chrome/i.test(brand)) {
    return "Chrome";
  }
  if (/edge/i.test(brand)) {
    return "Edge";
  }
  if (/firefox/i.test(brand)) {
    return "Firefox";
  }
  if (/safari/i.test(brand)) {
    return "Safari";
  }
  if (/opera/i.test(brand)) {
    return "Opera";
  }

  return brand;
}
