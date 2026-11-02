import assert from "node:assert/strict";
import { test } from "node:test";
import { faviconUrlForHost, linkHostname } from "./faviconUrl.js";

test("linkHostname reads http, https, and protocol-relative hosts", () => {
  assert.equal(linkHostname("https://www.linkedin.com/in/janedoe"), "www.linkedin.com");
  assert.equal(linkHostname("http://example.com"), "example.com");
  assert.equal(linkHostname("//cdn.example.com/path"), "cdn.example.com");
});

test("linkHostname rejects non-web and invalid input", () => {
  assert.equal(linkHostname("mailto:team@usebondery.com"), null);
  assert.equal(linkHostname("javascript:alert(1)"), null);
  assert.equal(linkHostname("/relative-path"), null);
  assert.equal(linkHostname(""), null);
});

test("faviconUrlForHost drops the www prefix and lowercases", () => {
  assert.equal(
    faviconUrlForHost("WWW.LinkedIn.com"),
    "https://icons.duckduckgo.com/ip3/linkedin.com.ico",
  );
});
