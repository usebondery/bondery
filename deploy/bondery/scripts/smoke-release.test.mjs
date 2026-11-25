import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  TRAEFIK_IMAGE,
  TRAEFIK_VIEW_DIR,
  traefikRunArgs,
  traefikTransportFailures,
} from "./smoke-release-traefik.mjs";

const PUBLISHED_PORT_RE = /^\d+\.\d+\.\d+\.\d+:\d+:\d+$/;
const INLINE_CERT_FAILURE = "inlines a client certificate";
const CLIENT_PAIR_RE = /certificates:[\s\S]*?rootCAs:/;
const NO_PASSED_RE = /passed/;
const USAGE_RE = /Usage: smoke-release\.mjs --tag/;
const UNKNOWN_SERVICE_ARG_RE = /Unknown argument: --service/;
const SMOKE = resolve(dirname(fileURLToPath(import.meta.url)), "smoke-release.mjs");

/** A transport as the current publish-transports.sh writes it: CA inline, client pair by path. */
const STORAGE_TRANSPORT = `http:
  serversTransports:
    bondery-storage:
      serverName: bondery-storage
      certificates:
        - certFile: ${TRAEFIK_VIEW_DIR}/certificates/bondery/storage-client.crt
          keyFile: ${TRAEFIK_VIEW_DIR}/certificates/bondery/storage-client.key
      rootCAs:
        - |
          -----BEGIN CERTIFICATE-----
          MIIB
          -----END CERTIFICATE-----
`;
const API_TRANSPORT = `http:
  serversTransports:
    bondery-api:
      serverName: bondery-api
      rootCAs:
        - |
          -----BEGIN CERTIFICATE-----
          MIIB
          -----END CERTIFICATE-----
`;
const storage = {
  clientCertificate: true,
  name: "bondery-storage",
  prefix: "bondery",
  service: "storage",
};
const api = { clientCertificate: false, name: "bondery-api", prefix: "bondery", service: "api" };

describe("traefikTransportFailures", () => {
  it("accepts the transports the job writes", () => {
    assert.deepEqual(traefikTransportFailures(STORAGE_TRANSPORT, storage), []);
    assert.deepEqual(traefikTransportFailures(API_TRANSPORT, api), []);
  });

  it("rejects an inline client certificate, which Traefik refuses to load", () => {
    const inline = STORAGE_TRANSPORT.replace(
      CLIENT_PAIR_RE,
      "certificates:\n        - cert: |\n            x\n          key: |\n            y\n      rootCAs:",
    );
    const failures = traefikTransportFailures(inline, storage);
    assert.ok(failures.some((failure) => failure.includes(INLINE_CERT_FAILURE)));
  });

  it("requires the client pair under certificates/<prefix>/", () => {
    const flat = STORAGE_TRANSPORT.replaceAll(
      "/certificates/bondery/storage-client",
      "/bondery-storage-client",
    );
    const failures = traefikTransportFailures(flat, storage);
    assert.equal(failures.length, 2);
  });

  it("requires the stack's server name", () => {
    const failures = traefikTransportFailures(
      API_TRANSPORT.replace("serverName: bondery-api", "serverName: other"),
      api,
    );
    assert.deepEqual(failures, ["serverName is not bondery-api"]);
  });
});

describe("traefikRunArgs", () => {
  const args = traefikRunArgs({ dynamicDir: "/work/.smoke-traefik-dynamic" });

  it("runs the pinned Traefik on dokploy-network with Dokploy's dynamic mount path", () => {
    assert.ok(args.includes(TRAEFIK_IMAGE));
    assert.ok(args.includes("dokploy-network"));
    assert.ok(args.includes(`/work/.smoke-traefik-dynamic:${TRAEFIK_VIEW_DIR}:ro`));
    assert.equal(TRAEFIK_VIEW_DIR, "/etc/dokploy/traefik/dynamic");
  });

  it("defines the resolver the compose routers name, and never reaches Let's Encrypt", () => {
    assert.ok(args.some((arg) => arg.startsWith("--certificatesResolvers.letsencrypt.")));
    assert.ok(args.some((arg) => arg.includes("caServer=https://127.0.0.1:")));
  });

  it("binds published ports to loopback", () => {
    const published = args.filter((arg) => PUBLISHED_PORT_RE.test(arg));
    assert.ok(published.length > 0);
    assert.ok(published.every((arg) => arg.startsWith("127.0.0.1:")));
  });
});

describe("smoke-release.mjs arguments", () => {
  const run = (...args) => spawnSync(process.execPath, [SMOKE, ...args], { encoding: "utf8" });

  it("exits 1 with the usage when --tag is missing", () => {
    const result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, USAGE_RE);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, NO_PASSED_RE);
  });

  it("rejects the removed --service flag instead of ignoring it", () => {
    const result = run("--service", "api", "--tag", "1.0.0");
    assert.equal(result.status, 1);
    assert.match(result.stderr, UNKNOWN_SERVICE_ARG_RE);
  });
});
