import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToMarkdown } from "./htmlToMarkdown.js";
import { markdownToHtml } from "./markdownToHtml.js";

describe("notes mention conversion", () => {
  it("preserves mention id and label through html → markdown → html", () => {
    const html =
      '<p><span data-type="mention" data-id="person-1" data-label="Jane Doe">@Jane Doe</span></p>';
    const markdown = htmlToMarkdown(html);
    assert.equal(markdown, "[@Jane Doe](bp://person/person-1)");
    assert.equal(
      markdownToHtml(markdown),
      '<p><span data-type="mention" data-id="person-1" data-label="Jane Doe">@Jane Doe</span></p>',
    );
  });

  it("keeps unlabeled mention tokens as wire format", () => {
    const html = '<p><span data-type="mention" data-id="person-1" data-label="">@</span></p>';
    assert.equal(htmlToMarkdown(html), "[[bp:person:person-1]]");
    assert.equal(
      markdownToHtml("[[bp:person:person-1]]"),
      '<p><span data-type="mention" data-id="person-1" data-label="">@</span></p>',
    );
  });

  it("matches mention spans when data-id comes before data-type", () => {
    const html = '<p><span data-id="person-1" data-type="mention" data-label="Ada">@Ada</span></p>';
    assert.equal(htmlToMarkdown(html), "[@Ada](bp://person/person-1)");
  });
});
