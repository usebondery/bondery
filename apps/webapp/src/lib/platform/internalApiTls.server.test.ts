import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { INTERNAL_API_CA_FILE_ENV, trustInternalApiCa } from "./internalApiTls.server";

const CANNOT_READ_BONDERY_API_CLIENT_CA_CRT_ENOENT_API =
  /cannot read \(\/bondery-api\/client\/ca\.crt\): ENOENT.*api:secrets/;
const DOES_NOT_USE_HTTPS = /does not use https/;
const NO_PEM = /no PEM/;
const NOT_ENCRYPTED = /not encrypted/;

const SYSTEM_CA = "-----BEGIN CERTIFICATE-----\nU1lTVEVN\n-----END CERTIFICATE-----";
const API_CA = "-----BEGIN CERTIFICATE-----\nQVBJIENB\n-----END CERTIFICATE-----";
const SECOND_CA = "-----BEGIN CERTIFICATE-----\nU0VDT05E\n-----END CERTIFICATE-----";

function fakeTrustStore() {
  const calls: string[][] = [];
  return {
    calls,
    store: {
      getCACertificates: () => [SYSTEM_CA],
      setDefaultCACertificates: (certificates: string[]) => {
        calls.push(certificates);
      },
    },
  };
}

const HTTPS_ENV = {
  BONDERY_INFRA_INTERNAL_API_URL: "https://bondery-api:26631",
  [INTERNAL_API_CA_FILE_ENV]: "/bondery-api/client/ca.crt",
};

describe("trustInternalApiCa", () => {
  it("adds every certificate in the CA file to the CAs Node already trusts", () => {
    const { calls, store } = fakeTrustStore();
    const outcome = trustInternalApiCa(HTTPS_ENV, () => `${API_CA}\n${SECOND_CA}\n`, store);
    assert.deepEqual(calls, [[SYSTEM_CA, API_CA, SECOND_CA]]);
    assert.deepEqual(outcome, { caFile: "/bondery-api/client/ca.crt", warning: null });
  });

  it("leaves the trust store alone without a CA file", () => {
    const { calls, store } = fakeTrustStore();
    const outcome = trustInternalApiCa(
      { BONDERY_INFRA_INTERNAL_API_URL: "https://api.example.com" },
      () => {
        throw new Error("must not read");
      },
      store,
    );
    assert.deepEqual(calls, []);
    assert.equal(outcome.caFile, null);
  });

  it("refuses a CA file with a plaintext internal URL", () => {
    const { store } = fakeTrustStore();
    assert.throws(
      () =>
        trustInternalApiCa(
          { ...HTTPS_ENV, BONDERY_INFRA_INTERNAL_API_URL: "http://bondery-api:26631" },
          () => API_CA,
          store,
        ),
      DOES_NOT_USE_HTTPS,
    );
  });

  it("explains an unreadable CA file and how to create one", () => {
    const { store } = fakeTrustStore();
    assert.throws(
      () =>
        trustInternalApiCa(
          HTTPS_ENV,
          () => {
            throw Object.assign(new Error("no such file or directory"), { code: "ENOENT" });
          },
          store,
        ),
      CANNOT_READ_BONDERY_API_CLIENT_CA_CRT_ENOENT_API,
    );
  });

  it("refuses a CA file with no certificate in it", () => {
    const { calls, store } = fakeTrustStore();
    assert.throws(() => trustInternalApiCa(HTTPS_ENV, () => "not a pem", store), NO_PEM);
    assert.deepEqual(calls, []);
  });

  it("warns only for a plaintext internal URL in production", () => {
    const { store } = fakeTrustStore();
    const plaintext = { BONDERY_INFRA_INTERNAL_API_URL: "http://bondery-api:26631" };
    assert.match(
      trustInternalApiCa({ ...plaintext, NODE_ENV: "production" }, () => "", store).warning ?? "",
      NOT_ENCRYPTED,
    );
    assert.equal(
      trustInternalApiCa({ ...plaintext, NODE_ENV: "development" }, () => "", store).warning,
      null,
    );
    assert.equal(
      trustInternalApiCa({ ...HTTPS_ENV, NODE_ENV: "production" }, () => API_CA, store).warning,
      null,
    );
  });
});
