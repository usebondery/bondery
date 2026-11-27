import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DavXmlError, type DavXmlErrorCode } from "./errors.js";
import { parsePropfind } from "./parse-propfind.js";
import { parseReport } from "./parse-report.js";
import { MAX_DAV_XML_BYTES } from "./tree.js";

function expectCode(code: DavXmlErrorCode) {
  return (error: unknown) => error instanceof DavXmlError && error.code === code;
}

const BOTH_PARSERS: [string, (body: string) => unknown][] = [
  ["parsePropfind", parsePropfind],
  ["parseReport", parseReport],
];

describe("xml layer security", () => {
  for (const [label, parse] of BOTH_PARSERS) {
    it(`${label} rejects a DOCTYPE`, () => {
      const body = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY x SYSTEM "file:///etc/passwd">]><D:propfind xmlns:D="DAV:"><D:propname/></D:propfind>`;
      assert.throws(() => parse(body), expectCode("forbidden_construct"));
    });

    it(`${label} rejects a bare DOCTYPE in any letter case`, () => {
      assert.throws(
        () => parse(`<!doctype html><D:propfind xmlns:D="DAV:"><D:propname/></D:propfind>`),
        expectCode("forbidden_construct"),
      );
    });

    it(`${label} rejects an ENTITY declaration`, () => {
      assert.throws(
        () => parse(`<!ENTITY a "b"><D:propfind xmlns:D="DAV:"/>`),
        expectCode("forbidden_construct"),
      );
    });

    it(`${label} rejects a body over 1 MiB`, () => {
      const padding = " ".repeat(MAX_DAV_XML_BYTES + 1);
      assert.throws(
        () => parse(`<D:propfind xmlns:D="DAV:"><D:propname/></D:propfind>${padding}`),
        expectCode("body_too_large"),
      );
    });

    it(`${label} counts bytes, not characters, against the cap`, () => {
      // 400 000 characters of 3 bytes each is 1.2 MB.
      const body = `<D:propfind xmlns:D="DAV:"><D:propname/><!--${"€".repeat(400_000)}--></D:propfind>`;
      assert.throws(() => parse(body), expectCode("body_too_large"));
    });

    it(`${label} rejects malformed XML`, () => {
      for (const body of [
        '<D:propfind xmlns:D="DAV:"><D:prop>',
        "not xml at all",
        `<D:propfind xmlns:D="DAV:"></D:other>`,
        `<x:propfind/>`,
        `<D:propfind xmlns:D="DAV:"><D:propname/></D:propfind><second/>`,
      ]) {
        assert.throws(() => parse(body), expectCode("malformed_xml"), body);
      }
    });

    it(`${label} does not expand an undeclared entity`, () => {
      assert.throws(
        () => parse(`<D:propfind xmlns:D="DAV:"><D:prop><D:a>&xxe;</D:a></D:prop></D:propfind>`),
        expectCode("malformed_xml"),
      );
    });

    it(`${label} rejects very deep nesting`, () => {
      const depth = 200;
      const body = `<D:propfind xmlns:D="DAV:">${"<D:a>".repeat(depth)}${"</D:a>".repeat(depth)}</D:propfind>`;
      assert.throws(() => parse(body), expectCode("invalid_request"));
    });
  }

  it("accepts a body of exactly 1 MiB", () => {
    const head = `<D:propfind xmlns:D="DAV:"><D:propname/><!--`;
    const tail = `--></D:propfind>`;
    const fill = "a".repeat(MAX_DAV_XML_BYTES - head.length - tail.length);
    assert.deepEqual(parsePropfind(`${head}${fill}${tail}`), { kind: "propname" });
  });

  it("does not echo input in the error message", () => {
    const secret = "SECRET-TOKEN-123";
    for (const body of [
      `<!DOCTYPE ${secret}>`,
      `<${secret}`,
      `<D:propfind xmlns:D="DAV:"><${secret}/></D:x>`,
    ]) {
      assert.throws(
        () => parsePropfind(body),
        (error) => error instanceof DavXmlError && !error.message.includes(secret),
      );
    }
  });

  it("strips a leading byte order mark", () => {
    assert.deepEqual(parsePropfind(`﻿<D:propfind xmlns:D="DAV:"><D:propname/></D:propfind>`), {
      kind: "propname",
    });
  });
});
