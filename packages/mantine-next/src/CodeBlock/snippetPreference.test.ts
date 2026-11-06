import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  CODE_BLOCK_SNIPPET_COOKIE,
  getCodeBlockSnippet,
  parseCodeBlockSnippets,
  resetCodeBlockSnippetCache,
  setCodeBlockSnippet,
  subscribeCodeBlockSnippet,
} from "#CodeBlock/snippetPreference.js";

type FakeDocument = { cookie: string };

const globalScope = globalThis as { document?: FakeDocument };
const originalDocument = globalScope.document;

function installDocument(cookie = ""): FakeDocument {
  const document = { cookie };
  globalScope.document = document;
  resetCodeBlockSnippetCache();
  return document;
}

afterEach(() => {
  if (originalDocument === undefined) {
    delete globalScope.document;
  } else {
    globalScope.document = originalDocument;
  }
  resetCodeBlockSnippetCache();
});

describe("parseCodeBlockSnippets", () => {
  it("reads a JSON map of block key to snippet id", () => {
    const value = encodeURIComponent(JSON.stringify({ "api-sample": "python" }));
    assert.deepEqual(parseCodeBlockSnippets(value), { "api-sample": "python" });
  });

  it("returns an empty map for a missing, malformed, or non-object value", () => {
    assert.deepEqual(parseCodeBlockSnippets(null), {});
    assert.deepEqual(parseCodeBlockSnippets(""), {});
    assert.deepEqual(parseCodeBlockSnippets("not-json"), {});
    assert.deepEqual(parseCodeBlockSnippets(encodeURIComponent("[1,2]")), {});
  });

  it("drops entries that are not a non-empty string pair", () => {
    const value = encodeURIComponent(JSON.stringify({ "": "x", a: 1, b: "", keep: "curl" }));
    assert.deepEqual(parseCodeBlockSnippets(value), { keep: "curl" });
  });
});

describe("getCodeBlockSnippet", () => {
  it("returns null when the document has no cookie", () => {
    installDocument();
    assert.equal(getCodeBlockSnippet("api-sample"), null);
  });

  it("reads the stored choice for one key among other cookies", () => {
    const value = encodeURIComponent(JSON.stringify({ "api-sample": "python" }));
    installDocument(`theme=dark; ${CODE_BLOCK_SNIPPET_COOKIE}=${value}; locale=en`);

    assert.equal(getCodeBlockSnippet("api-sample"), "python");
  });

  it("keeps choices separate per block key", () => {
    const value = encodeURIComponent(
      JSON.stringify({ "api-sample": "python", "mcp-setup": "url" }),
    );
    installDocument(`${CODE_BLOCK_SNIPPET_COOKIE}=${value}`);

    assert.equal(getCodeBlockSnippet("api-sample"), "python");
    assert.equal(getCodeBlockSnippet("mcp-setup"), "url");
    assert.equal(getCodeBlockSnippet("unknown"), null);
  });
});

describe("setCodeBlockSnippet", () => {
  it("writes the choice and returns it on the next read", () => {
    const document = installDocument();

    setCodeBlockSnippet("api-sample", "python");

    assert.match(document.cookie, new RegExp(`^${CODE_BLOCK_SNIPPET_COOKIE}=`));
    assert.equal(getCodeBlockSnippet("api-sample"), "python");
  });

  it("keeps the other keys when one key changes", () => {
    installDocument();
    setCodeBlockSnippet("api-sample", "curl");
    setCodeBlockSnippet("mcp-setup", "url");

    setCodeBlockSnippet("api-sample", "python");

    assert.equal(getCodeBlockSnippet("api-sample"), "python");
    assert.equal(getCodeBlockSnippet("mcp-setup"), "url");
  });

  it("does not throw without a document", () => {
    delete globalScope.document;
    resetCodeBlockSnippetCache();

    assert.doesNotThrow(() => setCodeBlockSnippet("api-sample", "curl"));
    assert.equal(getCodeBlockSnippet("api-sample"), "curl");
  });
});

describe("subscribeCodeBlockSnippet", () => {
  it("calls every subscriber on a change and stops after unsubscribe", () => {
    installDocument();
    let first = 0;
    let second = 0;

    const unsubscribeFirst = subscribeCodeBlockSnippet(() => {
      first += 1;
    });
    const unsubscribeSecond = subscribeCodeBlockSnippet(() => {
      second += 1;
    });

    setCodeBlockSnippet("api-sample", "python");
    assert.deepEqual([first, second], [1, 1]);

    unsubscribeFirst();
    setCodeBlockSnippet("api-sample", "curl");
    assert.deepEqual([first, second], [1, 2]);

    unsubscribeSecond();
    setCodeBlockSnippet("api-sample", "javascript");
    assert.deepEqual([first, second], [1, 2]);
  });
});
