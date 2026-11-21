import assert from "node:assert/strict";
import { it } from "node:test";
import {
  absolutizeDocsLinks,
  type HasDocsPage,
  type RewriteOptions,
  rewriteDocsHref,
  rewriteDocsMarkdownLinks,
} from "./docs-markdown-links";

const ORIGIN = "https://usebondery.com";

/** Only `api/authentication` and `deploy/installation` exist as real pages. */
const hasPage: HasDocsPage = (slugs) => {
  const key = slugs.join("/");
  return (
    key === "api/authentication" || key === "deploy/installation" || key === "changelog/unreleased"
  );
};

/** `changelog/unreleased` exists but is unpublished. */
const isPublicPage: HasDocsPage = (slugs) => slugs.join("/") !== "changelog/unreleased";

const SOURCE_BASE = "https://github.com/usebondery/bondery/blob/main/docs";

function options(filePath: string): RewriteOptions {
  return {
    filePath,
    hasPage,
    isPublicPage,
    siteOrigin: ORIGIN,
    sourceBaseUrl: SOURCE_BASE,
  };
}

it("relative sibling link becomes an absolute markdown URL", () => {
  assert.equal(
    rewriteDocsHref("./authentication.mdx", options("api/index.mdx")),
    `${ORIGIN}/docs/api/authentication.md`,
  );
});

it("parent link resolves against the source directory", () => {
  assert.equal(
    rewriteDocsHref("../deploy/installation.mdx", options("api/index.mdx")),
    `${ORIGIN}/docs/deploy/installation.md`,
  );
});

it("a folder index has no markdown route, so it keeps the HTML URL", () => {
  assert.equal(
    rewriteDocsHref("./api-reference/index.mdx", options("api/authentication.mdx")),
    `${ORIGIN}/docs/api/api-reference`,
  );
});

it("absolute docs paths gain the origin and the markdown extension", () => {
  assert.equal(
    rewriteDocsHref("/docs/api/authentication", options("api/index.mdx")),
    `${ORIGIN}/docs/api/authentication.md`,
  );
});

it("a fragment survives the rewrite", () => {
  assert.equal(
    rewriteDocsHref("./authentication.mdx#tokens", options("api/index.mdx")),
    `${ORIGIN}/docs/api/authentication.md#tokens`,
  );
});

it("links that leave the docs tree stay untouched", () => {
  assert.equal(
    rewriteDocsHref("../../.github/workflows/verify.yml", options("api/index.mdx")),
    "../../.github/workflows/verify.yml",
  );
  assert.equal(
    rewriteDocsHref("../../../packages/translations/README.md", options("contributing/auth.mdx")),
    "../../../packages/translations/README.md",
  );
});

it("external links stay untouched", () => {
  assert.equal(
    rewriteDocsHref("https://example.com/a.mdx", options("api/index.mdx")),
    "https://example.com/a.mdx",
  );
  assert.equal(rewriteDocsHref("#section", options("api/index.mdx")), "#section");
});

it("root index page maps to the bare markdown URL", () => {
  assert.equal(rewriteDocsHref("index.mdx", options("index.mdx")), `${ORIGIN}/docs.md`);
  assert.equal(rewriteDocsHref("/docs", options("index.mdx")), `${ORIGIN}/docs.md`);
});

it("a trailing slash on the origin does not double up", () => {
  const withSlash: RewriteOptions = { ...options("api/index.mdx"), siteOrigin: `${ORIGIN}/` };

  assert.equal(
    rewriteDocsHref("./authentication.mdx", withSlash),
    `${ORIGIN}/docs/api/authentication.md`,
  );
});

it("an unpublished page links to its repository source", () => {
  assert.equal(
    rewriteDocsHref("unreleased.mdx", options("changelog/index.mdx")),
    `${SOURCE_BASE}/changelog/unreleased.mdx`,
  );
});

it("an unpublished page keeps a fragment on the repository link", () => {
  assert.equal(
    rewriteDocsHref("unreleased.mdx#notes", options("changelog/index.mdx")),
    `${SOURCE_BASE}/changelog/unreleased.mdx#notes`,
  );
});

it("fenced code blocks keep literal hrefs", () => {
  const markdown = ["```md", "[a](./authentication.mdx)", "```", "[b](./authentication.mdx)"].join(
    "\n",
  );

  const output = rewriteDocsMarkdownLinks(markdown, options("api/index.mdx"));

  assert.ok(output.includes("[a](./authentication.mdx)"), "fenced link must stay literal");
  assert.ok(
    output.includes(`[b](${ORIGIN}/docs/api/authentication.md)`),
    "prose link must be rewritten",
  );
});

it("image targets and plain text are left alone", () => {
  const markdown = "![alt](/img/diagram.webp)\n\nA sentence about `x.mdx` files.";

  assert.equal(
    rewriteDocsMarkdownLinks(markdown, options("api/index.mdx")),
    "![alt](/img/diagram.webp)\n\nA sentence about `x.mdx` files.",
  );
});

it("index links gain the origin", () => {
  const index = ["- [Getting started](/docs/getting-started)", "- [Overview](/docs)"].join("\n");

  assert.equal(
    absolutizeDocsLinks(index, ORIGIN),
    [`- [Getting started](${ORIGIN}/docs/getting-started)`, `- [Overview](${ORIGIN}/docs)`].join(
      "\n",
    ),
  );
});

it("index links keep a fragment and tolerate a trailing slash", () => {
  assert.equal(
    absolutizeDocsLinks("- [Tips](/docs/tips#faq)", `${ORIGIN}/`),
    `- [Tips](${ORIGIN}/docs/tips#faq)`,
  );
});

it("links outside /docs and absolute links are untouched", () => {
  const markdown = "- [Blog](/blog)\n- [Site](https://usebondery.com/docs/x)";

  assert.equal(absolutizeDocsLinks(markdown, ORIGIN), markdown);
});
