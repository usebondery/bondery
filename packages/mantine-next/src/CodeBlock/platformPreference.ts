import type { CodeBlockPlatform } from "#CodeBlock/CodeBlock.js";

/**
 * Cookie that stores the reader's platform choice.
 *
 * One value drives every code block on the page and every later page, so a reader
 * who picks Linux once keeps Linux. A choice is an override: until someone picks a
 * tab, each block follows the detected OS.
 *
 * This module holds no React import, so a server component can import it without
 * a `use client` boundary. The hook lives in `useCodeBlockPlatform.ts`.
 */
export const CODE_BLOCK_PLATFORM_COOKIE = "bondery_code_platform";

const COOKIE_MAX_AGE_SECONDS = 31_536_000;

const PLATFORMS: readonly string[] = ["windows", "macos", "linux"];

/** `undefined` means "cookie not read yet". `null` means "no choice stored". */
let cached: CodeBlockPlatform | null | undefined;

const listeners = new Set<() => void>();

/** Returns the platform for a cookie value, or `null` for anything else. */
export function parseCodeBlockPlatform(value: string | null | undefined): CodeBlockPlatform | null {
  if (!value || !PLATFORMS.includes(value)) {
    return null;
  }
  return value as CodeBlockPlatform;
}

function readCookie(): CodeBlockPlatform | null {
  if (typeof document === "undefined") {
    return null;
  }

  for (const part of document.cookie.split("; ")) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator) === CODE_BLOCK_PLATFORM_COOKIE) {
      return parseCodeBlockPlatform(decodeURIComponent(part.slice(separator + 1)));
    }
  }

  return null;
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Clears the memoised cookie read. For tests, and for a cookie change made outside this module. */
export function resetCodeBlockPlatformCache(): void {
  cached = undefined;
}

/** Current stored choice, or `null` when the reader has not picked a platform. */
export function getCodeBlockPlatform(): CodeBlockPlatform | null {
  if (cached === undefined) {
    cached = readCookie();
  }
  return cached;
}

/** Stores a choice and switches every mounted code block. */
export function setCodeBlockPlatform(platform: CodeBlockPlatform): void {
  cached = platform;

  if (typeof document !== "undefined") {
    void writeCookie(platform).catch(() => {});
  }

  notify();
}

type CookieStoreLike = {
  set: (options: {
    expires: number;
    name: string;
    path: string;
    sameSite: "lax";
    value: string;
  }) => Promise<void>;
};

/**
 * Cookie Store API when the browser has it, matching the webapp cookie helper.
 * The `document.cookie` path covers a browser without `cookieStore`.
 */
async function writeCookie(platform: CodeBlockPlatform): Promise<void> {
  const cookieStore = (globalThis as { cookieStore?: CookieStoreLike }).cookieStore;

  if (cookieStore) {
    await cookieStore.set({
      // The Cookie Store API takes a Unix timestamp in milliseconds.
      expires: Date.now() + COOKIE_MAX_AGE_SECONDS * 1000,
      name: CODE_BLOCK_PLATFORM_COOKIE,
      path: "/",
      sameSite: "lax",
      value: platform,
    });
    return;
  }

  document.cookie = `${CODE_BLOCK_PLATFORM_COOKIE}=${platform}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

/** Registers a listener for choice changes. Returns the unsubscribe function. */
export function subscribeCodeBlockPlatform(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
