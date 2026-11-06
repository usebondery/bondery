import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { CodeBlockPlatform } from "#CodeBlock/CodeBlock.js";
import {
  CODE_BLOCK_PLATFORM_COOKIE,
  getCodeBlockPlatform,
  parseCodeBlockPlatform,
  resetCodeBlockPlatformCache,
  setCodeBlockPlatform,
  subscribeCodeBlockPlatform,
} from "#CodeBlock/platformPreference.js";

type FakeDocument = { cookie: string };

const globalScope = globalThis as { document?: FakeDocument };
const originalDocument = globalScope.document;

function installDocument(cookie = ""): FakeDocument {
  const document = { cookie };
  globalScope.document = document;
  resetCodeBlockPlatformCache();
  return document;
}

afterEach(() => {
  if (originalDocument === undefined) {
    delete globalScope.document;
  } else {
    globalScope.document = originalDocument;
  }
  resetCodeBlockPlatformCache();
});

describe("parseCodeBlockPlatform", () => {
  it("accepts the three platforms", () => {
    for (const platform of ["windows", "macos", "linux"] as CodeBlockPlatform[]) {
      assert.equal(parseCodeBlockPlatform(platform), platform);
    }
  });

  it("rejects an unknown value, an empty value, and null", () => {
    assert.equal(parseCodeBlockPlatform("plan9"), null);
    assert.equal(parseCodeBlockPlatform(""), null);
    assert.equal(parseCodeBlockPlatform(null), null);
    assert.equal(parseCodeBlockPlatform(undefined), null);
  });
});

describe("getCodeBlockPlatform", () => {
  it("returns null when the document has no cookie", () => {
    installDocument();
    assert.equal(getCodeBlockPlatform(), null);
  });

  it("reads the stored choice", () => {
    installDocument(`${CODE_BLOCK_PLATFORM_COOKIE}=macos`);
    assert.equal(getCodeBlockPlatform(), "macos");
  });

  it("reads the choice among other cookies", () => {
    installDocument(`theme=dark; ${CODE_BLOCK_PLATFORM_COOKIE}=linux; locale=en`);
    assert.equal(getCodeBlockPlatform(), "linux");
  });

  it("ignores a value that is not a platform", () => {
    installDocument(`${CODE_BLOCK_PLATFORM_COOKIE}=plan9`);
    assert.equal(getCodeBlockPlatform(), null);
  });
});

describe("setCodeBlockPlatform", () => {
  it("writes the choice to the cookie and returns it on the next read", () => {
    const document = installDocument();

    setCodeBlockPlatform("linux");

    assert.match(document.cookie, /^bondery_code_platform=linux\b/);
    assert.equal(getCodeBlockPlatform(), "linux");
  });

  it("does not throw without a document", () => {
    delete globalScope.document;
    resetCodeBlockPlatformCache();

    assert.doesNotThrow(() => setCodeBlockPlatform("windows"));
    assert.equal(getCodeBlockPlatform(), "windows");
  });
});

describe("subscribeCodeBlockPlatform", () => {
  it("calls every subscriber on a change and stops after unsubscribe", () => {
    installDocument();
    let first = 0;
    let second = 0;

    const unsubscribeFirst = subscribeCodeBlockPlatform(() => {
      first += 1;
    });
    const unsubscribeSecond = subscribeCodeBlockPlatform(() => {
      second += 1;
    });

    setCodeBlockPlatform("windows");
    assert.deepEqual([first, second], [1, 1]);

    unsubscribeFirst();
    setCodeBlockPlatform("linux");
    assert.deepEqual([first, second], [1, 2]);

    unsubscribeSecond();
    setCodeBlockPlatform("macos");
    assert.deepEqual([first, second], [1, 2]);
  });
});
