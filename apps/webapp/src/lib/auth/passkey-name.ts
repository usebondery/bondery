const IOS_UA = /iPhone|iPad|iPod/iu;
const EDGE_UA = /Edg\//iu;
const OPERA_UA = /OPR\/|Opera\//iu;
const FIREFOX_UA = /Firefox\//iu;
const CHROME_UA = /Chrome\//iu;
const SAFARI_UA = /Safari\//iu;
const WINDOWS_UA = /Windows NT/iu;
const CHROME_OS_UA = /CrOS/iu;
const ANDROID_UA = /Android/iu;
const MAC_UA = /Mac OS X|Macintosh/iu;
const LINUX_UA = /Linux/iu;
const CHROME_BRAND = /chrome/iu;
const EDGE_BRAND = /edge/iu;
const FIREFOX_BRAND = /firefox/iu;
const SAFARI_BRAND = /safari/iu;
const OPERA_BRAND = /opera/iu;

type NavigatorBrands = ReadonlyArray<{ brand: string }>;

/** Chromium GREASE brands: `Not` + punctuation + `A` + punctuation + `Brand`. */
const CHROMIUM_GREASE_BRAND = /^Not\W+A\W+Brand$/iu;

type NavigatorUserAgentData = {
  brands?: NavigatorBrands;
  getHighEntropyValues?: (hints: string[]) => Promise<{ platform?: string }>;
};

function isIgnoredUserAgentBrand(brand: string): boolean {
  return brand === "Chromium" || CHROMIUM_GREASE_BRAND.test(brand);
}

function inferBrowser(userAgent: string, brands?: NavigatorBrands) {
  const highEntropy = brands?.find((entry) => !isIgnoredUserAgentBrand(entry.brand));
  if (highEntropy?.brand) {
    return shortenBrowserBrand(highEntropy.brand);
  }

  if (EDGE_UA.test(userAgent)) {
    return "Edge";
  }
  if (OPERA_UA.test(userAgent)) {
    return "Opera";
  }
  if (FIREFOX_UA.test(userAgent)) {
    return "Firefox";
  }
  if (CHROME_UA.test(userAgent) && !EDGE_UA.test(userAgent)) {
    return "Chrome";
  }
  if (SAFARI_UA.test(userAgent) && !CHROME_UA.test(userAgent)) {
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

  if (WINDOWS_UA.test(userAgent)) {
    return "Windows";
  }
  if (CHROME_OS_UA.test(userAgent)) {
    return "Chrome OS";
  }
  if (ANDROID_UA.test(userAgent)) {
    return "Android";
  }
  if (IOS_UA.test(userAgent)) {
    return "iOS";
  }
  if (MAC_UA.test(userAgent)) {
    return "macOS";
  }
  if (LINUX_UA.test(userAgent)) {
    return "Linux";
  }

  return null;
}

function shortenBrowserBrand(brand: string): string {
  if (CHROME_BRAND.test(brand)) {
    return "Chrome";
  }
  if (EDGE_BRAND.test(brand)) {
    return "Edge";
  }
  if (FIREFOX_BRAND.test(brand)) {
    return "Firefox";
  }
  if (SAFARI_BRAND.test(brand)) {
    return "Safari";
  }
  if (OPERA_BRAND.test(brand)) {
    return "Opera";
  }

  return brand;
}

export type PasskeyNameParts = {
  browser: string | null;
  os: string | null;
};

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
      ({ platform } = values);
    } catch {
      ({ brands } = uaData);
    }
  }

  return formatPasskeyName(
    inferPasskeyNameParts(navigator.userAgent, { brands, platform }),
    fallback,
    template,
  );
}
