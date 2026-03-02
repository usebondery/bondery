/**
 * Instagram Network Interceptor (WXT)
 *
 * This script runs in the MAIN world to intercept XHR/fetch requests
 * and extract profile metadata from Instagram's GraphQL API responses.
 *
 * It communicates with the content script via window.postMessage.
 */
import { defineUnlistedScript } from "#imports";

export default defineUnlistedScript(() => {
  const INSTAGRAM_NETWORK_MESSAGE_TYPE = "BONDERY_IG_NETWORK_META";
  const INSTAGRAM_NETWORK_MESSAGE_SOURCE = "bondery-instagram-network-interceptor";
  const TARGET_FRIENDLY_NAME = "PolarisProfilePageContentQuery";

  interface GraphqlUserNode {
    username?: string;
    full_name?: string;
    biography?: string;
    category?: string;
    profile_pic_url?: string;
    hd_profile_pic_url_info?: {
      url?: string;
    };
    address_street?: string;
    city_name?: string;
    zip?: string;
  }

  interface NetworkMetaPayload {
    username: string;
    displayName: string;
    description: string;
    category: string;
    photoUrl: string;
    addressStreet: string;
    cityName: string;
    zip: string;
  }

  type HeaderLike = HeadersInit | Record<string, string> | undefined;

  interface InterceptableXhr extends XMLHttpRequest {
    __bonderyRequestUrl?: string;
    __bonderyRequestMethod?: string;
    __bonderyRequestHeaders?: Record<string, string>;
  }

  function emitProfileMeta(meta: NetworkMetaPayload | null): void {
    if (!meta?.username) {
      return;
    }

    window.postMessage(
      {
        type: INSTAGRAM_NETWORK_MESSAGE_TYPE,
        source: INSTAGRAM_NETWORK_MESSAGE_SOURCE,
        payload: meta,
      },
      "*",
    );
  }

  function getHeaderValue(headers: HeaderLike, headerName: string): string {
    if (!headers) {
      return "";
    }

    const normalizedName = headerName.toLowerCase();

    if (typeof Headers !== "undefined" && headers instanceof Headers) {
      return headers.get(headerName) || headers.get(normalizedName) || "";
    }

    if (Array.isArray(headers)) {
      const found = headers.find((entry) => {
        if (!Array.isArray(entry) || entry.length < 2) {
          return false;
        }

        return String(entry[0]).toLowerCase() === normalizedName;
      });

      return found ? String(found[1] || "") : "";
    }

    if (typeof headers === "object") {
      const headerRecord = headers as Record<string, unknown>;

      for (const key of Object.keys(headerRecord)) {
        if (key.toLowerCase() === normalizedName) {
          return String(headerRecord[key] || "");
        }
      }
    }

    return "";
  }

  function getRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
    const initMethod = init?.method;
    if (initMethod) {
      return initMethod.toUpperCase();
    }

    if (typeof input !== "string" && "method" in input && input.method) {
      return String(input.method).toUpperCase();
    }

    return "GET";
  }

  function getRequestUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") {
      return input;
    }

    if (input instanceof URL) {
      return input.href;
    }

    if ("url" in input && input.url) {
      return input.url;
    }

    return "";
  }

  function extractProfileMetaFromResponse(jsonString: string): NetworkMetaPayload | null {
    try {
      const data = JSON.parse(jsonString);

      const findUser = (obj: unknown): GraphqlUserNode | null => {
        if (!obj || typeof obj !== "object") {
          return null;
        }

        const record = obj as Record<string, unknown>;

        if (record.username && typeof record.username === "string") {
          if (
            record.full_name !== undefined ||
            record.biography !== undefined ||
            record.profile_pic_url !== undefined
          ) {
            return record as unknown as GraphqlUserNode;
          }
        }

        for (const key of Object.keys(record)) {
          const found = findUser(record[key]);
          if (found) {
            return found;
          }
        }

        return null;
      };

      const user = findUser(data);
      if (!user?.username) {
        return null;
      }

      return {
        username: user.username,
        displayName: user.full_name || user.username,
        description: user.biography || "",
        category: user.category || "",
        photoUrl: user.hd_profile_pic_url_info?.url || user.profile_pic_url || "",
        addressStreet: user.address_street || "",
        cityName: user.city_name || "",
        zip: user.zip || "",
      };
    } catch {
      return null;
    }
  }

  function isTargetRequest(
    url: string,
    _method: string,
    headers: Record<string, string> | undefined,
  ): boolean {
    if (!url.includes("/graphql/query")) {
      return false;
    }

    const friendlyName = headers?.["x-fb-friendly-name"] || "";
    if (friendlyName === TARGET_FRIENDLY_NAME) {
      return true;
    }

    try {
      const urlObj = new URL(url);
      const docId = urlObj.searchParams.get("doc_id");
      const variables = urlObj.searchParams.get("variables");

      if (docId && variables) {
        try {
          const vars = JSON.parse(variables);
          if (vars.username || vars.user_id) {
            return true;
          }
        } catch {
          // ignore parse error
        }
      }

      if (urlObj.searchParams.get("query_hash")) {
        return true;
      }
    } catch {
      // ignore URL parse error
    }

    return false;
  }

  // ─── XHR Interceptor ─────────────────────────────────────────────────────────

  const OriginalXHR = window.XMLHttpRequest;

  function PatchedXHR(this: InterceptableXhr) {
    const xhr = new OriginalXHR() as InterceptableXhr;

    xhr.__bonderyRequestHeaders = {};

    const originalOpen = xhr.open.bind(xhr);
    xhr.open = function (method: string, url: string | URL, ...args: unknown[]) {
      xhr.__bonderyRequestMethod = method.toUpperCase();
      xhr.__bonderyRequestUrl = typeof url === "string" ? url : url.toString();
      return originalOpen(method, url, ...(args as [boolean?, string?, string?]));
    };

    const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);
    xhr.setRequestHeader = function (name: string, value: string) {
      if (xhr.__bonderyRequestHeaders) {
        xhr.__bonderyRequestHeaders[name.toLowerCase()] = value;
      }
      return originalSetRequestHeader(name, value);
    };

    xhr.addEventListener("load", () => {
      const url = xhr.__bonderyRequestUrl || "";
      const method = xhr.__bonderyRequestMethod || "GET";
      const headers = xhr.__bonderyRequestHeaders;

      if (!isTargetRequest(url, method, headers)) {
        return;
      }

      try {
        const meta = extractProfileMetaFromResponse(xhr.responseText);
        if (meta) {
          console.log("[instagram][xhr-intercept] Extracted profile meta:", meta.username);
          emitProfileMeta(meta);
        }
      } catch {
        // ignore processing errors
      }
    });

    return xhr;
  }

  Object.setPrototypeOf(PatchedXHR, OriginalXHR);
  Object.setPrototypeOf(PatchedXHR.prototype, OriginalXHR.prototype);

  // Copy static properties
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

  // ─── Fetch Interceptor ───────────────────────────────────────────────────────

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = getRequestMethod(input, init);
    const url = getRequestUrl(input);
    const headers: Record<string, string> = {};

    const initHeaders = init?.headers;
    if (initHeaders) {
      if (typeof Headers !== "undefined" && initHeaders instanceof Headers) {
        initHeaders.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });
      } else if (Array.isArray(initHeaders)) {
        for (const [key, value] of initHeaders) {
          headers[key.toLowerCase()] = value;
        }
      } else if (typeof initHeaders === "object") {
        for (const [key, value] of Object.entries(initHeaders)) {
          headers[key.toLowerCase()] = String(value);
        }
      }
    }

    const response = await originalFetch(input, init);

    if (isTargetRequest(url, method, headers)) {
      try {
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        const meta = extractProfileMetaFromResponse(text);
        if (meta) {
          console.log("[instagram][fetch-intercept] Extracted profile meta:", meta.username);
          emitProfileMeta(meta);
        }
      } catch {
        // ignore processing errors
      }
    }

    return response;
  };

  console.log("[instagram] Network interceptor initialized");
});
