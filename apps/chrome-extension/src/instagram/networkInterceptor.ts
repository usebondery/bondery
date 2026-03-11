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
    return input.toString();
  }

  if (typeof input === "object" && "url" in input && input.url) {
    return String(input.url);
  }

  return "";
}

function isTargetGraphqlRequest(requestUrl: string, method: string, headers: HeaderLike): boolean {
  if (!requestUrl || method !== "POST") {
    return false;
  }

  const friendlyName = getHeaderValue(headers, "x-fb-friendly-name");
  if (friendlyName !== TARGET_FRIENDLY_NAME) {
    return false;
  }

  try {
    const parsed = new URL(requestUrl, window.location.origin);
    return (
      parsed.hostname.toLowerCase().includes("instagram.com") &&
      parsed.pathname === "/graphql/query"
    );
  } catch {
    return false;
  }
}

function parseProfileMetaFromGraphqlPayload(payload: unknown): NetworkMetaPayload | null {
  const user = (payload as { data?: { user?: GraphqlUserNode } })?.data?.user;
  if (!user?.username) {
    return null;
  }

  const username = String(user.username || "").trim();
  if (!username) {
    return null;
  }

  return {
    username,
    displayName: String(user.full_name || username).trim() || username,
    description: String(user.biography || "").trim(),
    category: String(user.category || "").trim(),
    photoUrl: String(user.hd_profile_pic_url_info?.url || user.profile_pic_url || "").trim(),
    addressStreet: String(user.address_street || "").trim(),
    cityName: String(user.city_name || "").trim(),
    zip: String(user.zip || "").trim(),
  };
}

function installFetchInterceptor(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
      const requestInput = args[0];
      const requestInit = args[1];
      const requestUrl = getRequestUrl(requestInput);
      const requestMethod = getRequestMethod(requestInput, requestInit);
      const requestHeaders =
        requestInit?.headers ||
        (typeof requestInput !== "string" && "headers" in requestInput
          ? (requestInput.headers as HeaderLike)
          : undefined);

      if (
        isTargetGraphqlRequest(requestUrl, requestMethod, requestHeaders) &&
        response.status === 200
      ) {
        const payload = await response.clone().json();
        emitProfileMeta(parseProfileMetaFromGraphqlPayload(payload));
      }
    } catch {}

    return response;
  };
}

function installXhrInterceptor(): void {
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function open(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const xhr = this as InterceptableXhr;
    xhr.__bonderyRequestUrl = typeof url === "string" ? url : "";
    xhr.__bonderyRequestMethod = typeof method === "string" ? method.toUpperCase() : "GET";
    xhr.__bonderyRequestHeaders = {};

    return (originalXhrOpen as (...args: unknown[]) => void).apply(this, [
      method,
      url,
      async,
      username,
      password,
    ]);
  };

  XMLHttpRequest.prototype.setRequestHeader = function setRequestHeader(name, value) {
    const xhr = this as InterceptableXhr;

    if (!xhr.__bonderyRequestHeaders) {
      xhr.__bonderyRequestHeaders = {};
    }

    xhr.__bonderyRequestHeaders[String(name).toLowerCase()] = String(value);

    return originalXhrSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function send(...args) {
    this.addEventListener("loadend", () => {
      try {
        const xhr = this as InterceptableXhr;
        const responseUrl = xhr.responseURL || xhr.__bonderyRequestUrl || "";
        const requestMethod = xhr.__bonderyRequestMethod || "GET";
        const requestHeaders = xhr.__bonderyRequestHeaders || {};

        if (
          !isTargetGraphqlRequest(responseUrl, requestMethod, requestHeaders) ||
          xhr.status !== 200
        ) {
          return;
        }

        if (typeof xhr.responseText !== "string") {
          return;
        }

        const payload = JSON.parse(xhr.responseText);
        emitProfileMeta(parseProfileMetaFromGraphqlPayload(payload));
      } catch {}
    });

    return originalXhrSend.apply(this, args);
  };
}

function initInstagramNetworkInterceptor(): void {
  const interceptorWindow = window as typeof window & {
    __bonderyIgNetworkInterceptorInstalled?: boolean;
  };

  if (interceptorWindow.__bonderyIgNetworkInterceptorInstalled) {
    return;
  }

  interceptorWindow.__bonderyIgNetworkInterceptorInstalled = true;

  installFetchInterceptor();
  installXhrInterceptor();
}

initInstagramNetworkInterceptor();
