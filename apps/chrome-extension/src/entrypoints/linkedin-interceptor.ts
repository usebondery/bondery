/**
 * LinkedIn Network Interceptor (WXT)
 *
 * Runs in the MAIN world to intercept profile HTML responses from
 * https://www.linkedin.com/in/{username} and extract key profile fields.
 */
import { defineUnlistedScript } from "#imports";

export default defineUnlistedScript(() => {
  const LINKEDIN_INTERCEPT_STATUS_TYPE = "BONDERY_LINKEDIN_INTERCEPT_STATUS";
  const LINKEDIN_INTERCEPT_PROFILE_TYPE = "BONDERY_LINKEDIN_INTERCEPT_PROFILE";

  interface LinkedInInterceptedProfile {
    firstName: string;
    lastName: string;
    area?: string;
    description?: string;
    sourceUrl: string;
  }

  const seenProfiles = new Set<string>();

  function emitStatus(status: string, details?: Record<string, unknown>): void {
    window.postMessage(
      {
        type: LINKEDIN_INTERCEPT_STATUS_TYPE,
        source: "bondery-linkedin-network-interceptor",
        status,
        details,
      },
      "*",
    );
  }

  function emitProfile(profile: LinkedInInterceptedProfile): void {
    window.postMessage(
      {
        type: LINKEDIN_INTERCEPT_PROFILE_TYPE,
        source: "bondery-linkedin-network-interceptor",
        payload: profile,
      },
      "*",
    );
  }

  function decodeHtmlEntities(input: string): string {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = input;
    return textarea.value;
  }

  function extractByRegex(decoded: string): Omit<LinkedInInterceptedProfile, "sourceUrl"> | null {
    const firstNameMatch = decoded.match(/"firstName"\s*:\s*"([^"]+)"/i);
    const lastNameMatch = decoded.match(/"lastName"\s*:\s*"([^"]+)"/i);
    const areaMatch =
      decoded.match(/"defaultLocalizedNameWithoutCountryName"\s*:\s*"([^"]+)"/i) ||
      decoded.match(/"defaultLocalizedName"\s*:\s*"([^"]+)"/i);
    const descriptionMatch = decoded.match(/"headline"\s*:\s*"([^"]+)"/i);

    if (!firstNameMatch || !lastNameMatch) {
      return null;
    }

    return {
      firstName: firstNameMatch[1],
      lastName: lastNameMatch[1],
      area: areaMatch?.[1],
      description: descriptionMatch?.[1],
    };
  }

  function parseAreaFromIncluded(included: unknown, geoUrn?: string): string | undefined {
    if (!Array.isArray(included)) {
      return undefined;
    }

    if (geoUrn) {
      const exactGeo = included.find((item) => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const record = item as Record<string, unknown>;
        return record.entityUrn === geoUrn;
      }) as Record<string, unknown> | undefined;

      if (exactGeo) {
        const areaFromGeo =
          (typeof exactGeo.defaultLocalizedNameWithoutCountryName === "string" &&
            exactGeo.defaultLocalizedNameWithoutCountryName) ||
          (typeof exactGeo.defaultLocalizedName === "string" && exactGeo.defaultLocalizedName) ||
          undefined;

        if (areaFromGeo) {
          return areaFromGeo;
        }
      }
    }

    const firstGeo = included.find((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const record = item as Record<string, unknown>;
      return (
        typeof record.defaultLocalizedNameWithoutCountryName === "string" ||
        typeof record.defaultLocalizedName === "string"
      );
    }) as Record<string, unknown> | undefined;

    if (!firstGeo) {
      return undefined;
    }

    return (
      (typeof firstGeo.defaultLocalizedNameWithoutCountryName === "string" &&
        firstGeo.defaultLocalizedNameWithoutCountryName) ||
      (typeof firstGeo.defaultLocalizedName === "string" && firstGeo.defaultLocalizedName) ||
      undefined
    );
  }

  function extractFromCodeBlocks(
    decodedHtml: string,
    targetUsername: string | null,
  ): Omit<LinkedInInterceptedProfile, "sourceUrl"> | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedHtml, "text/html");
    const codeBlocks = Array.from(doc.querySelectorAll("code"));

    console.log(
      "[linkedin][interceptor] Checking",
      codeBlocks.length,
      "code blocks, target:",
      targetUsername,
    );

    for (const block of codeBlocks) {
      const payload = block.textContent?.trim();
      if (!payload || payload.length < 20) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      const parsedRecord = parsed as Record<string, unknown>;
      const included = Array.isArray(parsedRecord.included)
        ? parsedRecord.included
        : Array.isArray((parsedRecord.data as Record<string, unknown> | undefined)?.included)
          ? ((parsedRecord.data as Record<string, unknown>).included as unknown[])
          : undefined;

      if (!included || !Array.isArray(included)) {
        continue;
      }

      const allProfileRecords = included.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const record = item as Record<string, unknown>;
        return (
          typeof record.firstName === "string" &&
          typeof record.lastName === "string" &&
          typeof record.publicIdentifier === "string"
        );
      }) as Record<string, unknown>[];

      if (allProfileRecords.length === 0) {
        continue;
      }

      console.log(
        "[linkedin][interceptor] Found",
        allProfileRecords.length,
        "profile records:",
        allProfileRecords.map((r) => `${r.firstName} ${r.lastName} (${r.publicIdentifier})`),
      );

      // Prefer the profile matching the target username from the URL
      const profileRecord =
        (targetUsername &&
          allProfileRecords.find(
            (r) => String(r.publicIdentifier).toLowerCase() === targetUsername,
          )) ||
        allProfileRecords[0];

      const geoLocation = profileRecord.geoLocation as Record<string, unknown> | undefined;
      const geoUrn = typeof geoLocation?.["*geo"] === "string" ? geoLocation["*geo"] : undefined;

      return {
        firstName: String(profileRecord.firstName),
        lastName: String(profileRecord.lastName),
        area: parseAreaFromIncluded(included, geoUrn),
        description:
          typeof profileRecord.headline === "string" ? profileRecord.headline : undefined,
      };
    }

    return null;
  }

  function extractLinkedInProfileFromHtml(
    html: string,
    targetUsername: string | null,
  ): Omit<LinkedInInterceptedProfile, "sourceUrl"> | null {
    const decoded = decodeHtmlEntities(html);
    return extractFromCodeBlocks(decoded, targetUsername) || extractByRegex(decoded);
  }

  function getTargetUsernameFromUrl(): string | null {
    const match = window.location.pathname.match(/^\/in\/([^/?#]+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  function extractFromLiveDocument(): Omit<LinkedInInterceptedProfile, "sourceUrl"> | null {
    const targetUsername = getTargetUsernameFromUrl();
    return extractFromCodeBlocks(document.documentElement.innerHTML, targetUsername);
  }

  function isLinkedInProfileRequest(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      return (
        parsed.hostname.toLowerCase().includes("linkedin.com") &&
        /^\/in\/[^/?#]+\/?$/i.test(parsed.pathname)
      );
    } catch {
      return false;
    }
  }

  function logProfile(profile: LinkedInInterceptedProfile): void {
    const fingerprint = `${profile.sourceUrl}|${profile.firstName}|${profile.lastName}|${profile.area || ""}|${profile.description || ""}`;
    if (seenProfiles.has(fingerprint)) {
      return;
    }

    seenProfiles.add(fingerprint);
    console.log("[linkedin][html-intercept] Parsed profile", {
      firstName: profile.firstName,
      lastName: profile.lastName,
      area: profile.area,
      description: profile.description,
      sourceUrl: profile.sourceUrl,
    });
    emitProfile(profile);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : "";

    // Handle chrome-extension:// URLs (used by LinkedIn for extension detection)
    // by returning a rejected promise directly, preventing error logging through our wrapper
    if (requestUrl.startsWith("chrome-extension://")) {
      return Promise.reject(new TypeError("Failed to fetch"));
    }

    // Passthrough non-http/https requests (blob:, data:, etc.)
    if (!requestUrl.startsWith("http://") && !requestUrl.startsWith("https://")) {
      return originalFetch(input, init);
    }

    // Skip tracking/metrics URLs - these are often blocked by adblockers
    if (
      requestUrl.includes("/sensorCollect") ||
      requestUrl.includes("/li/track") ||
      requestUrl.includes("/realtime/") ||
      requestUrl.includes("/beacon/") ||
      requestUrl.includes("/platform-telemetry/")
    ) {
      return originalFetch(input, init);
    }

    if (!isLinkedInProfileRequest(requestUrl)) {
      return originalFetch(input, init);
    }

    // Only use async for LinkedIn profile requests we actually want to intercept
    return (async () => {
      const response = await originalFetch(input, init);

      try {
        const html = await response.clone().text();
        // Extract username from the request URL
        const urlMatch = requestUrl.match(/\/in\/([^/?#]+)/i);
        const targetUsername = urlMatch ? urlMatch[1].toLowerCase() : null;
        const parsed = extractLinkedInProfileFromHtml(html, targetUsername);
        if (parsed) {
          logProfile({
            ...parsed,
            sourceUrl: requestUrl,
          });
        }
      } catch {
        // ignore parsing issues
      }

      return response;
    })();
  };

  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR(this: XMLHttpRequest) {
    const xhr = new OriginalXHR();
    let requestUrl = "";

    const originalOpen = xhr.open.bind(xhr);
    xhr.open = function (method: string, url: string | URL, ...args: unknown[]) {
      requestUrl = typeof url === "string" ? url : url.toString();
      (originalOpen as (...callArgs: unknown[]) => unknown)(method, url, ...args);
    };

    xhr.addEventListener("load", () => {
      if (!isLinkedInProfileRequest(requestUrl)) {
        return;
      }

      try {
        const html = typeof xhr.responseText === "string" ? xhr.responseText : "";
        // Extract username from the request URL
        const urlMatch = requestUrl.match(/\/in\/([^/?#]+)/i);
        const targetUsername = urlMatch ? urlMatch[1].toLowerCase() : null;
        const parsed = extractLinkedInProfileFromHtml(html, targetUsername);
        if (parsed) {
          logProfile({
            ...parsed,
            sourceUrl: requestUrl,
          });
        }
      } catch {
        // ignore parsing issues
      }
    });

    return xhr;
  }

  Object.setPrototypeOf(PatchedXHR, OriginalXHR);
  Object.setPrototypeOf(PatchedXHR.prototype, OriginalXHR.prototype);

  for (const key of Object.getOwnPropertyNames(OriginalXHR)) {
    if (key !== "prototype" && key !== "length" && key !== "name") {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(OriginalXHR, key);
        if (descriptor) {
          Object.defineProperty(PatchedXHR, key, descriptor);
        }
      } catch {
        // ignore
      }
    }
  }

  (window as unknown as { XMLHttpRequest: typeof XMLHttpRequest }).XMLHttpRequest =
    PatchedXHR as unknown as typeof XMLHttpRequest;

  function tryParseDocument(): boolean {
    console.log("[linkedin][interceptor] Document parse attempt");

    const parsedFromCurrentDocument = extractFromLiveDocument();
    if (parsedFromCurrentDocument) {
      logProfile({
        ...parsedFromCurrentDocument,
        sourceUrl: `${window.location.href}#document`,
      });
      emitStatus("parsed-document");
      return true;
    }
    return false;
  }

  // Try immediately
  try {
    if (!tryParseDocument()) {
      emitStatus("document-parse-no-match");

      // Retry after delays since LinkedIn renders client-side
      const retryDelays = [500, 1000, 2000, 3000];
      retryDelays.forEach((delay) => {
        setTimeout(() => {
          console.log(`[linkedin][interceptor] Retry parse after ${delay}ms`);
          tryParseDocument();
        }, delay);
      });
    }
  } catch (err) {
    console.error("[linkedin][interceptor] Document parse error:", err);
    emitStatus("document-parse-failed");
  }

  console.log("[linkedin] HTML profile interceptor initialized");
  emitStatus("initialized");
});
