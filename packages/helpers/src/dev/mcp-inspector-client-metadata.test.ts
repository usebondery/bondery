import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMcpInspectorOAuthClientMetadataDocument,
  MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL,
} from "./mcp-inspector-client-metadata.js";

describe("buildMcpInspectorOAuthClientMetadataDocument", () => {
  it("sets client_id to the metadata document URL", () => {
    const doc = buildMcpInspectorOAuthClientMetadataDocument();
    assert.equal(doc.client_id, MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL);
    assert.ok(doc.client_name.trim().length > 0);
    assert.ok(doc.redirect_uris.includes("http://127.0.0.1:6274/oauth/callback"));
    assert.ok(doc.redirect_uris.includes("http://localhost:6276/oauth/callback"));
  });
});
