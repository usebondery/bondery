import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { connect, createServer } from "node:tls";

import {
  ensureStorageSecrets,
  STORAGE_API_CLIENT_COMMON_NAME,
  STORAGE_CERTIFICATE_COMMON_NAME,
  STORAGE_CERTIFICATE_RENEW_BEFORE_DAYS,
  STORAGE_TRAEFIK_CLIENT_COMMON_NAME,
  storageCertificateNames,
  storageSecretPaths,
} from "./storage-secrets.js";
import { createCertificateAuthority, DAY_MS, issueServerCertificate } from "./x509.js";

const CERTIFICATE_ALERT_CLOSED_PATTERN = /certificate|alert|closed/iu;
const ALTNAMES_HOSTNAME_PATTERN = /altnames|Hostname/u;

type Pair = { cert: string; key: string };

function quietLog(): (message: string) => void {
  return () => undefined;
}

/**
 * A TLS handshake between two SeaweedFS nodes: the server requires a client certificate signed
 * by `ca` (security.toml sets `ca` on every server), and the client verifies the server against
 * `ca` and `servername`. Resolves with the common name of the client the server accepted.
 */
async function mutualHandshake(options: {
  ca: string;
  client?: Pair;
  server: Pair;
  servername: string;
}): Promise<string> {
  let peerCommonName = "";
  const server = createServer(
    {
      ca: options.ca,
      cert: options.server.cert,
      key: options.server.key,
      rejectUnauthorized: true,
      requestCert: true,
    },
    (socket) => {
      peerCommonName = String(socket.getPeerCertificate().subject?.CN ?? "");
      socket.end("ok");
    },
  );
  // A rejected client surfaces as a server-side error; the client sees the alert.
  server.on("tlsClientError", () => undefined);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = connect({
        ca: options.ca,
        host: "127.0.0.1",
        port: address.port,
        servername: options.servername,
        ...(options.client ? { cert: options.client.cert, key: options.client.key } : {}),
      });
      // TLS 1.3 sends the server's verdict on the client certificate after the handshake, so
      // wait for application data (or the alert) instead of the handshake callback.
      socket.on("data", () => {
        socket.end();
        resolve();
      });
      socket.on("error", reject);
      socket.on("end", () => reject(new Error("closed without data")));
    });
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
  return peerCommonName;
}

async function readCluster(root: string): Promise<{ ca: string; pair: Pair }> {
  const paths = storageSecretPaths(root);
  return {
    ca: await readFile(paths.clusterCaFile, "utf8"),
    pair: {
      cert: await readFile(paths.clusterCertFile, "utf8"),
      key: await readFile(paths.clusterKeyFile, "utf8"),
    },
  };
}

describe("storage secrets", () => {
  const roots: string[] = [];

  after(async () => {
    await Promise.all(
      roots.map((createdRoot) => rm(createdRoot, { force: true, recursive: true })),
    );
  });

  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "bondery-storage-secrets-"));
    roots.push(root);
  });

  function ensure(overrides: { now?: Date; prefix?: string; log?: (message: string) => void }) {
    return ensureStorageSecrets({
      chownToContainerUsers: false,
      log: overrides.log ?? quietLog(),
      now: overrides.now,
      prefix: overrides.prefix ?? "bondery",
      root,
    });
  }

  it("covers every node, the stack alias, localhost and loopback", () => {
    assert.deepEqual(storageCertificateNames("bondery-beta"), {
      dns: [
        "seaweedfs-master",
        "seaweedfs-volume",
        "seaweedfs-filer",
        "seaweedfs-s3",
        "localhost",
        "bondery-beta-storage",
      ],
      ip: ["127.0.0.1"],
    });
  });

  it("lets two nodes authenticate each other with the one cluster certificate", async () => {
    await ensure({});
    const { ca, pair } = await readCluster(root);
    for (const servername of ["seaweedfs-volume", "seaweedfs-filer", "bondery-storage"]) {
      const accepted = await mutualHandshake({ ca, client: pair, server: pair, servername });
      assert.equal(accepted, STORAGE_CERTIFICATE_COMMON_NAME);
    }
  });

  it("gives the API and Traefik each their own client certificate, and neither the other's key", async () => {
    await ensure({});
    const paths = storageSecretPaths(root);
    const clientCa = await readFile(paths.clientCaFile, "utf8");
    assert.equal(clientCa, await readFile(paths.caCertFile, "utf8"));
    assert.ok(!clientCa.includes("PRIVATE KEY"));

    // Both client certificates chain to the same CA, so the gateway accepts either one.
    const { ca } = await readCluster(root);
    const apiPair = {
      cert: await readFile(paths.apiClientCertFile, "utf8"),
      key: await readFile(paths.clientKeyFile, "utf8"),
    };
    const traefikPair = {
      cert: await readFile(paths.traefikCertFile, "utf8"),
      key: await readFile(paths.traefikKeyFile, "utf8"),
    };
    assert.notEqual(apiPair.cert, traefikPair.cert);
    assert.equal(await readFile(paths.traefikCaFile, "utf8"), ca);

    const server = await readCluster(root);
    assert.equal(
      await mutualHandshake({
        ca,
        client: apiPair,
        server: server.pair,
        servername: "seaweedfs-s3",
      }),
      STORAGE_API_CLIENT_COMMON_NAME,
    );
    assert.equal(
      await mutualHandshake({
        ca,
        client: traefikPair,
        server: server.pair,
        servername: "seaweedfs-s3",
      }),
      STORAGE_TRAEFIK_CLIENT_COMMON_NAME,
    );
  });

  it("refuses a node without a client certificate", async () => {
    await ensure({});
    const { ca, pair } = await readCluster(root);
    await assert.rejects(
      mutualHandshake({ ca, server: pair, servername: "seaweedfs-volume" }),
      CERTIFICATE_ALERT_CLOSED_PATTERN,
    );
  });

  it("refuses a client certificate from another CA", async () => {
    await ensure({});
    const { ca, pair } = await readCluster(root);
    const otherAuthority = await createCertificateAuthority({
      commonName: "other",
      validityDays: 30,
    });
    const foreign = await issueServerCertificate({
      authority: otherAuthority,
      clientAuth: true,
      commonName: STORAGE_CERTIFICATE_COMMON_NAME,
      names: storageCertificateNames("bondery"),
      validityDays: 30,
    });
    await assert.rejects(
      mutualHandshake({
        ca,
        client: { cert: foreign.certificatePem, key: foreign.privateKeyPem },
        server: pair,
        servername: "seaweedfs-volume",
      }),
      CERTIFICATE_ALERT_CLOSED_PATTERN,
    );
  });

  it("refuses a host name the certificate does not cover", async () => {
    await ensure({});
    const { ca, pair } = await readCluster(root);
    await assert.rejects(
      mutualHandshake({ ca, client: pair, server: pair, servername: "other-storage" }),
      ALTNAMES_HOSTNAME_PATTERN,
    );
  });

  it("keeps a valid CA and certificate on later runs", async () => {
    assert.deepEqual(await ensure({}), {
      authorityGenerated: true,
      certificateGenerated: true,
      clientCertificatesGenerated: true,
    });
    const before = await readCluster(root);
    assert.deepEqual(await ensure({}), {
      authorityGenerated: false,
      certificateGenerated: false,
      clientCertificatesGenerated: false,
    });
    assert.deepEqual(await readCluster(root), before);
  });

  it("reissues only the certificate when the stack prefix changes", async () => {
    await ensure({});
    const caBefore = (await readCluster(root)).ca;
    const messages: string[] = [];
    const result = await ensure({
      log: (message) => {
        messages.push(message);
      },
      prefix: "bondery-beta",
    });
    assert.deepEqual(result, {
      authorityGenerated: false,
      certificateGenerated: true,
      clientCertificatesGenerated: false,
    });
    assert.ok(messages.some((message) => message.includes("does not cover bondery-beta-storage")));
    const restartHint = messages.find((message) => message.includes("--force-recreate"));
    assert.ok(restartHint?.includes("seaweedfs-master"), "the hint names the nodes to recreate");
    const { ca, pair } = await readCluster(root);
    assert.equal(ca, caBefore);
    await mutualHandshake({ ca, client: pair, server: pair, servername: "bondery-beta-storage" });
  });

  it("reissues a certificate that cannot authenticate clients", async () => {
    await ensure({});
    const paths = storageSecretPaths(root);
    const authority = {
      certificatePem: await readFile(paths.caCertFile, "utf8"),
      privateKeyPem: await readFile(paths.caKeyFile, "utf8"),
    };
    const serverOnly = await issueServerCertificate({
      authority,
      commonName: STORAGE_CERTIFICATE_COMMON_NAME,
      names: storageCertificateNames("bondery"),
      validityDays: 3650,
    });
    await writeFile(paths.clusterCertFile, serverOnly.certificatePem);
    await writeFile(paths.clusterKeyFile, serverOnly.privateKeyPem);

    const messages: string[] = [];
    const result = await ensure({
      log: (message) => {
        messages.push(message);
      },
    });
    assert.equal(result.certificateGenerated, true);
    assert.ok(messages.some((message) => message.includes("does not allow client authentication")));
  });

  it("reissues the certificate before it expires", async () => {
    await ensure({});
    // The client certificates share the same validity, so they are reissued in the same run.
    const later = new Date(
      Date.now() + (10 * 365 - STORAGE_CERTIFICATE_RENEW_BEFORE_DAYS + 1) * DAY_MS,
    );
    assert.deepEqual(await ensure({ now: later }), {
      authorityGenerated: false,
      certificateGenerated: true,
      clientCertificatesGenerated: true,
    });
  });

  it("reissues the certificate and refreshes every CA copy when the CA is replaced", async () => {
    await ensure({});
    await rm(storageSecretPaths(root).caKeyFile);
    assert.deepEqual(await ensure({}), {
      authorityGenerated: true,
      certificateGenerated: true,
      clientCertificatesGenerated: true,
    });
    const paths = storageSecretPaths(root);
    const ca = await readFile(paths.caCertFile, "utf8");
    assert.equal(await readFile(paths.clusterCaFile, "utf8"), ca);
    assert.equal(await readFile(paths.clientCaFile, "utf8"), ca);
    const { pair } = await readCluster(root);
    await mutualHandshake({ ca, client: pair, server: pair, servername: "seaweedfs-s3" });
  });

  it("keeps private keys private to their owner", {
    skip: process.platform === "win32",
  }, async () => {
    await ensure({});
    const paths = storageSecretPaths(root);
    for (const path of [paths.caKeyFile, paths.clusterKeyFile]) {
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    }
    for (const dir of [paths.caDir, paths.clusterDir]) {
      assert.equal((await stat(dir)).mode & 0o777, 0o700);
    }
  });
});
