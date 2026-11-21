import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToMarkdown } from "./htmlToMarkdown.js";
import { markdownToHtml } from "./markdownToHtml.js";

/**
 * Names of event-handler attributes on live tags. It parses attributes the way a browser does, so
 * `onmouseover` inside a quoted `href` value, or in escaped text, is correctly not counted, while
 * an injected quote that ends the value early is.
 */
function eventHandlerAttributes(html: string): string[] {
  const names: string[] = [];
  for (const tag of html.matchAll(/<[a-z][^\s>/]*((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>/gi)) {
    for (const attribute of (tag[1] ?? "").matchAll(/\s+([^\s=>/]+)(?:="[^"]*")?/g)) {
      const name = attribute[1] ?? "";
      if (/^on/i.test(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

/** Markup that must never reach the output as a live tag or attribute. */
const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  '<a href="javascript:alert(1)">x</a>',
  "<svg onload=alert(1)>",
  '<iframe src="https://evil.test"></iframe>',
  '<span style="position:fixed" onmouseover="alert(1)">x</span>',
];

describe("markdownToHtml escapes raw markup", () => {
  for (const payload of PAYLOADS) {
    it(`renders ${JSON.stringify(payload)} as text`, () => {
      const html = markdownToHtml(payload);
      assert.doesNotMatch(html, /<(script|img|svg|iframe|a|span)\b/i);
      assert.match(html, /&lt;/);
    });
  }

  it("escapes markup inside headings, quotes, lists, tasks, and inline code", () => {
    const html = markdownToHtml(
      [
        "# <img src=x onerror=1>",
        "> <script>1</script>",
        "- <b onclick=1>x</b>",
        "1. <i onclick=1>x</i>",
        "- [ ] <u onclick=1>x</u>",
        "`<script>`",
      ].join("\n"),
    );
    assert.doesNotMatch(html, /<(img|script|b|i)\b/i);
    assert.deepEqual(eventHandlerAttributes(html), []);
  });

  it("cannot break out of an attribute through a link target or mention label", () => {
    const link = markdownToHtml('[x](https://a.test/" onmouseover="alert(1))');
    assert.deepEqual(eventHandlerAttributes(link), []);
    const mention = markdownToHtml('[@Ada" onmouseover="alert(1)](bp://person/id" onfocus="x)');
    assert.deepEqual(eventHandlerAttributes(mention), []);
    const date = markdownToHtml('[[bp:date:1" onmouseover="alert(1)]]');
    assert.deepEqual(eventHandlerAttributes(date), []);
    // Sanity: the helper does catch a real break-out.
    assert.deepEqual(eventHandlerAttributes('<a href="x" onmouseover="alert(1)">'), [
      "onmouseover",
    ]);
  });

  it("drops link targets outside http, https, mailto, and tel", () => {
    for (const url of [
      "javascript:alert(1)",
      " JAVASCRIPT:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:x",
      "//evil.test",
      "/relative",
    ]) {
      const html = markdownToHtml(`[click](${url})`);
      assert.doesNotMatch(html, /href=/i, `href survived for ${JSON.stringify(url)}`);
      assert.match(html, /click/);
    }
  });

  it("keeps safe links", () => {
    assert.equal(
      markdownToHtml("[site](https://example.com/a?b=1&c=2)"),
      '<p><a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">site</a></p>',
    );
    assert.match(markdownToHtml("[mail](mailto:a@b.test)"), /href="mailto:a@b\.test"/);
    assert.match(markdownToHtml("[call](tel:+420123456789)"), /href="tel:\+420123456789"/);
  });

  it("keeps formatting and the underline tag", () => {
    assert.equal(
      markdownToHtml("a **b** _i_ ~~s~~ ==m== <u>u</u>"),
      "<p>a <strong>b</strong> <em>i</em> <s>s</s> <mark>m</mark> <u>u</u></p>",
    );
  });
});

describe("notes round trip keeps special characters as text", () => {
  it("html → markdown → html does not double-escape", () => {
    const html = "<p>1 &lt; 2 &amp;&amp; 3 &gt; 2 &quot;q&quot; it&#39;s</p>";
    const markdown = htmlToMarkdown(html);
    assert.equal(markdown, `1 < 2 && 3 > 2 "q" it's`);
    assert.equal(
      markdownToHtml(markdown),
      "<p>1 &lt; 2 &amp;&amp; 3 &gt; 2 &quot;q&quot; it&#39;s</p>",
    );
  });

  it("decodes in a single pass", () => {
    assert.equal(htmlToMarkdown("<p>&amp;lt;</p>"), "&lt;");
  });

  it("turns an escaped script tag back into the same text, never a tag", () => {
    const html = "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>";
    const roundTripped = markdownToHtml(htmlToMarkdown(html));
    assert.doesNotMatch(roundTripped, /<script/i);
    assert.match(roundTripped, /&lt;script&gt;/);
  });
});
