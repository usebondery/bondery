/**
 * Cookie that stores the reader's choice of code snippet, keyed by block.
 *
 * One value per block key, so a reader who picks Python for API samples keeps
 * Python on every later page. A choice is an override: until someone picks a tab,
 * a block keeps the default it was given.
 *
 * This module holds no React import, so a server component can import it without
 * a `use client` boundary. The hook lives in `useCodeBlockSnippet.ts`.
 */
export const CODE_BLOCK_SNIPPET_COOKIE = "bondery_code_snippet";

const COOKIE_MAX_AGE_SECONDS = 31_536_000;

/** Block key to snippet id. */
type SnippetChoices = Record<string, string>;

/** `undefined` means "cookie not read yet". */
let cached: SnippetChoices | undefined;

const listeners = new Set<() => void>();

/** Returns a plain map, or an empty map for a missing or malformed cookie. */
export function parseCodeBlockSnippets(value: string | null | undefined): SnippetChoices {
  if (!value) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const choices: SnippetChoices = {};
    for (const [key, id] of Object.entries(parsed)) {
      if (typeof id === "string" && key.length > 0 && id.length > 0) {
        choices[key] = id;
      }
    }
    return choices;
  } catch {
    return {};
  }
}

function readCookie(): SnippetChoices {
  if (typeof document === "undefined") {
    return {};
  }

  for (const part of document.cookie.split("; ")) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator) === CODE_BLOCK_SNIPPET_COOKIE) {
      return parseCodeBlockSnippets(part.slice(separator + 1));
    }
  }

  return {};
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Clears the memoised cookie read. For tests, and for a cookie change made outside this module. */
export function resetCodeBlockSnippetCache(): void {
  cached = undefined;
}

/**
 * The stored snippet id for one block key, or `null` when the reader has not
 * picked one. Returns a primitive, so it is safe as a `useSyncExternalStore`
 * snapshot.
 */
export function getCodeBlockSnippet(key: string): string | null {
  if (cached === undefined) {
    cached = readCookie();
  }

  return cached[key] ?? null;
}

/** Stores a choice for one block key and switches every block that uses the key. */
export function setCodeBlockSnippet(key: string, id: string): void {
  const choices = { ...readCookie(), [key]: id };
  cached = choices;

  if (typeof document !== "undefined") {
    void writeCookie(choices).catch(() => {});
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
async function writeCookie(choices: SnippetChoices): Promise<void> {
  const value = encodeURIComponent(JSON.stringify(choices));
  const cookieStore = (globalThis as { cookieStore?: CookieStoreLike }).cookieStore;

  if (cookieStore) {
    await cookieStore.set({
      // The Cookie Store API takes a Unix timestamp in milliseconds.
      expires: Date.now() + COOKIE_MAX_AGE_SECONDS * 1000,
      name: CODE_BLOCK_SNIPPET_COOKIE,
      path: "/",
      sameSite: "lax",
      value,
    });
    return;
  }

  document.cookie = `${CODE_BLOCK_SNIPPET_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

/** Registers a listener for choice changes. Returns the unsubscribe function. */
export function subscribeCodeBlockSnippet(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
