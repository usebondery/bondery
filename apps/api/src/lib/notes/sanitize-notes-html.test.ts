import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeNotesHtml } from "./sanitize-notes-html.js";

const REL_NOOPENER_NOREFERRER_PATTERN = /rel="noopener noreferrer"/;
const HREF_PATTERN = /href="/;
const HREF_TEL_PATTERN = /href="tel:/;
const URL_POSITION_BACKGROUND_PATTERN = /url\(|position|background/i;
const EXPRESSION_PATTERN = /expression/;
const CLASS_LANGUAGE_TS_PATTERN = /class="language-ts"/;
const SCRIPT_IMG_STYLE_MATH_NOSCRIPT_PATTERN = /<(script|img|style|math|noscript)/i;
const SON_W_PATTERN = /\son\w+=/i;
const IMG_IFRAME_SVG_OBJECT_FORM_BUTTON_PATTERN = /<(img|iframe|svg|object|form|button)/i;
const ONERROR_ONLOAD_PATTERN = /onerror|onload/i;
const HREF_PATTERN_2 = /href=/i;
const CLICK_PATTERN = /click/;
const TARGET_BLANK_PATTERN = /target="_blank"/;
const SELF_OPENER_PATTERN = /_self|"opener"/;

describe("sanitizeNotesHtml", () => {
  it("passes null and undefined through", () => {
    assert.equal(sanitizeNotesHtml(null), null);
    assert.equal(sanitizeNotesHtml(undefined), undefined);
  });

  it("drops script elements and their body", () => {
    assert.equal(sanitizeNotesHtml("<p>hi</p><script>alert(1)</script>"), "<p>hi</p>");
  });

  it("drops event handler attributes", () => {
    assert.equal(sanitizeNotesHtml('<p onclick="alert(1)">hi</p>'), "<p>hi</p>");
  });

  it("drops img, iframe, svg, object, and form elements", () => {
    const html =
      '<img src=x onerror="alert(1)"><iframe src="https://evil.test"></iframe>' +
      "<svg onload=alert(1)></svg><object data=x></object><form action=x><button>go</button></form>";
    const result = sanitizeNotesHtml(html);
    assert.doesNotMatch(result, IMG_IFRAME_SVG_OBJECT_FORM_BUTTON_PATTERN);
    assert.doesNotMatch(result, ONERROR_ONLOAD_PATTERN);
  });

  it("removes javascript: and data: link targets but keeps the link text", () => {
    for (const href of [
      "javascript:alert(1)",
      " JaVaScRiPt:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "//evil.test/x",
      "/relative/path",
    ]) {
      const result = sanitizeNotesHtml(`<a href="${href}">click</a>`);
      assert.doesNotMatch(result, HREF_PATTERN_2, `href survived for ${JSON.stringify(href)}`);
      assert.match(result, CLICK_PATTERN);
    }
  });

  it("keeps http, https, mailto, and tel links and forces rel and target", () => {
    for (const href of ["https://example.com/a?b=1&c=2", "http://example.com", "mailto:a@b.test"]) {
      const result = sanitizeNotesHtml(`<a href="${href}" target="_self" rel="opener">x</a>`);
      assert.match(result, REL_NOOPENER_NOREFERRER_PATTERN);
      assert.match(result, TARGET_BLANK_PATTERN);
      assert.doesNotMatch(result, SELF_OPENER_PATTERN);
      assert.match(result, HREF_PATTERN);
    }
    assert.match(sanitizeNotesHtml('<a href="tel:+420123456789">call</a>'), HREF_TEL_PATTERN);
  });

  it("drops style declarations except plain colors", () => {
    assert.equal(
      sanitizeNotesHtml('<span style="color: #fa5252">x</span>'),
      '<span style="color:#fa5252">x</span>',
    );
    const hostile = sanitizeNotesHtml(
      '<span style="color: red; background: url(javascript:alert(1)); position: fixed">x</span>',
    );
    assert.doesNotMatch(hostile, URL_POSITION_BACKGROUND_PATTERN);
    assert.doesNotMatch(
      sanitizeNotesHtml('<span style="color: expression(alert(1))">x</span>'),
      EXPRESSION_PATTERN,
    );
  });

  it("limits class on code to language-*", () => {
    assert.match(
      sanitizeNotesHtml('<pre><code class="language-ts evil">x</code></pre>'),
      CLASS_LANGUAGE_TS_PATTERN,
    );
  });

  it("neutralizes the checkbox input to a plain checkbox", () => {
    const result = sanitizeNotesHtml('<input type="file" onfocus="alert(1)" autofocus checked>');
    assert.equal(result, '<input type="checkbox" checked />');
  });

  it("escapes stray angle brackets in plain text", () => {
    assert.equal(sanitizeNotesHtml("1 < 2 && 3 > 2"), "1 &lt; 2 &amp;&amp; 3 &gt; 2");
  });

  it("does not let an nested or malformed payload reassemble", () => {
    for (const payload of [
      "<scr<script>ipt>alert(1)</scr</script>ipt>",
      "<<script>script>alert(1)<</script>/script>",
      '<a href="https://ok.test" onmouseover="alert(1)">x</a>',
      "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    ]) {
      const result = sanitizeNotesHtml(payload);
      assert.doesNotMatch(result, SCRIPT_IMG_STYLE_MATH_NOSCRIPT_PATTERN, payload);
      assert.doesNotMatch(result, SON_W_PATTERN, payload);
    }
  });

  it("is idempotent", () => {
    const hostile =
      '<p onclick="x">a &amp; b</p><script>1</script><a href="javascript:x">l</a><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked></label><div><p>t</p></div></li></ul>';
    const once = sanitizeNotesHtml(hostile);
    assert.equal(sanitizeNotesHtml(once), once);
  });

  it("keeps everything the notes editor produces", () => {
    const editorHtml = [
      "<h1>Title</h1><h2>Two</h2><h3>Three</h3>",
      "<p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <mark>m</mark> <code>c</code></p>",
      '<p><span style="color:#fa5252">red</span></p>',
      "<blockquote><p>q</p></blockquote><hr />",
      "<ul><li><p>a</p></li></ul><ol><li><p>b</p></li></ol>",
      '<ul data-type="taskList"><li data-checked="false" data-type="taskItem"><label><input type="checkbox" /></label><div><p>todo</p></div></li></ul>',
      '<p><span data-type="mention" data-id="0190aaaa-0000-7000-8000-000000000001" data-label="Ada" data-mention-suggestion-char="@">@Ada</span></p>',
      '<p><span data-type="inline-date" data-timestamp="2026-11-18T00:00:00.000Z"></span></p>',
      '<p><span data-type="emoji" data-name="smile">😄</span></p>',
      '<p><a rel="noopener noreferrer" target="_blank" href="https://example.com">link</a></p>',
    ].join("");
    assert.equal(sanitizeNotesHtml(editorHtml), editorHtml);
  });
});
