import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSampleRequest,
  PATH_PLACEHOLDERS,
  type SampleRequestInput,
} from "./api-sample-request.js";

const SERVERS = [
  { description: "Local development server", url: "https://api.usebondery.test" },
  { description: "Production server", url: "https://api.usebondery.com" },
];

const BEARER = [[{ key: "bearerAuth" }]];

const PRODUCTION_HOST = "https://api.usebondery.com";

function build(input: Partial<SampleRequestInput> & Pick<SampleRequestInput, "method" | "path">) {
  const sample = buildSampleRequest({
    parameters: [],
    security: [],
    servers: SERVERS,
    ...input,
  });

  assert.ok(sample, "expected a sample for this operation");
  return sample;
}

describe("buildSampleRequest", () => {
  it("renders a GET with the query default and no body", () => {
    const sample = build({
      method: "get",
      parameters: [
        {
          in: "query",
          items: [
            { name: "limit", schema: { default: 50, type: "integer" } },
            { name: "search", schema: { type: "string" } },
          ],
        },
      ],
      path: "/contacts",
      security: BEARER,
    });

    assert.match(sample.curl, /^curl -X GET "https:\/\/api\.usebondery\.com\/contacts\?limit=50"/);
    assert.ok(sample.curl.includes("Authorization: Bearer YOUR_API_TOKEN"));
    assert.ok(!sample.curl.includes("-d "));
    assert.ok(!sample.curl.includes("Content-Type"));
    assert.ok(sample.javascript.includes('"Authorization": "Bearer YOUR_API_TOKEN"'));
    assert.ok(sample.python.includes('"Authorization": "Bearer YOUR_API_TOKEN"'));
  });

  it("renders a POST example body on the production host", () => {
    const sample = build({
      method: "post",
      path: "/contacts",
      requestBody: {
        content: {
          "application/json": {
            example: {
              firstName: "Ada",
              lastName: "Lovelace",
              phones: [{ preferred: true, prefix: "+44", type: "home", value: "2079460958" }],
            },
          },
        },
      },
      security: BEARER,
    });

    for (const code of [sample.curl, sample.javascript, sample.python]) {
      assert.ok(code.includes("Ada"), "expected the example value in every language");
      assert.ok(code.includes(PRODUCTION_HOST));
      assert.ok(!code.includes("api.usebondery.test"));
    }

    assert.ok(sample.curl.includes('-H "Content-Type: application/json"'));
    assert.ok(sample.curl.includes(`-d '{`));
    assert.ok(sample.javascript.includes("JSON.stringify({"));
    assert.ok(sample.python.includes("payload = {"));
    assert.ok(sample.python.includes("json=payload"));
  });

  it("reads the bundled examples.default.value shape", () => {
    const sample = build({
      method: "post",
      path: "/tags",
      requestBody: {
        content: {
          "application/json": {
            examples: { default: { value: { label: "Investors" } } },
          },
        },
      },
      security: BEARER,
    });

    assert.ok(sample.curl.includes('"label": "Investors"'));
    assert.ok(sample.python.includes('"label": "Investors"'));
  });

  it("renders a multipart upload and fills the path placeholder", () => {
    const sample = build({
      method: "post",
      parameters: [
        { in: "path", items: [{ name: "id", required: true, schema: { format: "uuid" } }] },
      ],
      path: "/contacts/{id}/photo",
      security: BEARER,
    });

    assert.ok(sample.curl.includes('-F "file=@photo.jpg"'));
    assert.ok(sample.curl.includes(`${PRODUCTION_HOST}/contacts/${PATH_PLACEHOLDERS.id}/photo`));
    assert.ok(!sample.curl.includes("{id}"));
    assert.ok(!sample.curl.includes("Content-Type"));
    assert.ok(sample.javascript.includes("FormData"));
    assert.ok(sample.python.includes("files="));
  });

  it("omits the Authorization header for an unauthenticated operation", () => {
    const sample = build({
      method: "get",
      path: "/health/live",
      security: [],
    });

    for (const code of [sample.curl, sample.javascript, sample.python]) {
      assert.ok(!code.includes("Authorization"));
    }
  });

  it("falls back to the last server entry when no production server is named", () => {
    const sample = build({
      method: "get",
      path: "/tags",
      servers: [{ description: "Staging", url: "https://staging.example.com/" }],
    });

    assert.ok(sample.curl.includes("https://staging.example.com/tags"));
  });

  it("falls back to the production host when no server is listed", () => {
    const sample = build({ method: "get", path: "/tags", servers: undefined });

    assert.ok(sample.curl.includes(`${PRODUCTION_HOST}/tags`));
  });

  it("fills every required query parameter and skips optional ones", () => {
    const sample = build({
      method: "get",
      parameters: [
        {
          in: "query",
          items: [
            { name: "maxLat", required: true, schema: { type: "number" } },
            { name: "tag_id", required: true, schema: { format: "uuid", type: "string" } },
            {
              name: "mode",
              required: true,
              schema: { enum: ["address", "place"], type: "string" },
            },
            { name: "search", schema: { type: "string" } },
          ],
        },
      ],
      path: "/contacts/map-pins",
    });

    assert.ok(sample.curl.includes(`maxLat=1`));
    assert.ok(sample.curl.includes(`tag_id=${PATH_PLACEHOLDERS.id}`));
    assert.ok(sample.curl.includes("mode=address"));
    assert.ok(!sample.curl.includes("search="));
  });

  it("returns null when the method or path is empty", () => {
    const base = { method: "get", path: "/contacts" };

    assert.equal(buildSampleRequest({ ...base, method: " ", parameters: [], security: [] }), null);
    assert.equal(buildSampleRequest({ ...base, parameters: [], path: "  ", security: [] }), null);
  });
});
