import { extLog } from "../../../lib/log";
/**
 * Instagram GraphQL network interceptor (MAIN world).
 * Communicates with the content script via window.postMessage.
 */
export const INSTAGRAM_NETWORK_MESSAGE_TYPE = "BONDERY_IG_NETWORK_META";
export const INSTAGRAM_NETWORK_MESSAGE_SOURCE = "bondery-instagram-network-interceptor";

const TARGET_FRIENDLY_NAME = "PolarisProfilePageContentQuery";

interface GraphqlUserNode {
  address_street?: string;
  biography?: string;
  category?: string;
  city_name?: string;
  full_name?: string;
  hd_profile_pic_url_info?: {
    url?: string;
  };
  profile_pic_url?: string;
  username?: string;
  zip?: string;
}

export interface NetworkMetaPayload {
  addressStreet: string;
  category: string;
  cityName: string;
  description: string;
  displayName: string;
  photoUrl: string;
  username: string;
  zip: string;
}

interface InterceptableXhr extends XMLHttpRequest {
  __bonderyRequestHeaders?: Record<string, string>;
  __bonderyRequestMethod?: string;
  __bonderyRequestUrl?: string;
}

function emitProfileMeta(meta: NetworkMetaPayload | null): void {
  if (!meta?.username) {
    return;
  }

  window.postMessage(
    {
      payload: meta,
      source: INSTAGRAM_NETWORK_MESSAGE_SOURCE,
      type: INSTAGRAM_NETWORK_MESSAGE_TYPE,
    },
    "*",
  );
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
      addressStreet: user.address_street || "",
      category: user.category || "",
      cityName: user.city_name || "",
      description: user.biography || "",
      displayName: user.full_name || user.username,
      photoUrl: user.hd_profile_pic_url_info?.url || user.profile_pic_url || "",
      username: user.username,
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

export function installInstagramNetworkInterceptor(): void {
  const OriginalXHR = window.XMLHttpRequest;

  function PatchedXHR(this: InterceptableXhr) {
    const xhr = new OriginalXHR() as InterceptableXhr;

    xhr.__bonderyRequestHeaders = {};

    const originalOpen = xhr.open.bind(xhr);
    xhr.open = (method: string, url: string | URL, ...args: unknown[]) => {
      xhr.__bonderyRequestMethod = method.toUpperCase();
      xhr.__bonderyRequestUrl = typeof url === "string" ? url : url.toString();
      return originalOpen(method, url, ...(args as [boolean?, string?, string?]));
    };

    const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);
    xhr.setRequestHeader = (name: string, value: string) => {
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
          extLog.debug("[instagram][xhr-intercept] Extracted profile meta:", meta.username);
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

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
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
          extLog.debug("[instagram][fetch-intercept] Extracted profile meta:", meta.username);
          emitProfileMeta(meta);
        }
      } catch {
        // ignore processing errors
      }
    }

    return response;
  };

  extLog.debug("[instagram] Network interceptor initialized");
}
