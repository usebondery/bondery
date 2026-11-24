import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatMessage, formatText, splitMessage } from "./message";

function render(node: ReturnType<typeof formatMessage>): string {
  return renderToStaticMarkup(createElement("div", null, node));
}

describe("splitMessage", () => {
  it("keeps text without placeholders as one part", () => {
    assert.deepEqual(splitMessage("No placeholders here."), ["No placeholders here."]);
  });

  it("returns text and placeholder names in reading order", () => {
    assert.deepEqual(splitMessage("Base URL for {field} fields: {url}"), [
      "Base URL for ",
      { token: "field" },
      " fields: ",
      { token: "url" },
    ]);
  });

  it("handles adjacent placeholders and placeholders at either end", () => {
    assert.deepEqual(splitMessage("{a}{b}"), [{ token: "a" }, { token: "b" }]);
    assert.deepEqual(splitMessage("{a} x"), [{ token: "a" }, " x"]);
  });

  it("returns no parts for an empty message", () => {
    assert.deepEqual(splitMessage(""), []);
  });
});

describe("formatText", () => {
  it("returns a string with every placeholder filled", () => {
    assert.equal(formatText("{category} Blog", { category: "Tech" }), "Tech Blog");
    assert.equal(formatText("{count} reminders coming up", { count: 2 }), "2 reminders coming up");
  });

  it("returns the template unchanged without placeholders", () => {
    assert.equal(formatText("Page Not Found"), "Page Not Found");
  });

  it("leaves a missing placeholder visible", () => {
    assert.equal(formatText("Last updated {date}"), "Last updated {date}");
  });
});

describe("formatMessage", () => {
  it("returns a plain string when every value is text or a number", () => {
    assert.equal(formatMessage("{minutes} min read", { minutes: 4 }), "4 min read");
    assert.equal(
      formatMessage('No results for "{query}".', { query: "ada" }),
      'No results for "ada".',
    );
  });

  it("returns the template unchanged when it has no placeholders", () => {
    assert.equal(formatMessage("Page Not Found"), "Page Not Found");
  });

  it("leaves a missing placeholder visible", () => {
    assert.equal(formatMessage("Last updated {date}", {}), "Last updated {date}");
    assert.equal(
      render(formatMessage("See {link} now", { other: createElement("b", null, "x") })),
      "<div>See {link} now</div>",
    );
  });

  it("places a node where the translator put the placeholder", () => {
    const link = createElement("a", { href: "/releases" }, "GitHub Releases");
    assert.equal(
      render(formatMessage("Earlier versions: see {link} for tags.", { link })),
      '<div>Earlier versions: see <a href="/releases">GitHub Releases</a> for tags.</div>',
    );
  });

  it("supports a placeholder that opens the sentence and a repeated placeholder", () => {
    const code = createElement("code", null, "file");
    assert.equal(
      render(formatMessage("{code} and {code}", { code })),
      "<div><code>file</code> and <code>file</code></div>",
    );
  });

  it("mixes node and text values in one message", () => {
    const field = createElement("code", null, "doc_url");
    assert.equal(
      render(
        formatMessage("Base URL for {field} fields: {url}", { field, url: "https://example.com" }),
      ),
      "<div>Base URL for <code>doc_url</code> fields: https://example.com</div>",
    );
  });
});
