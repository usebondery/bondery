import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { connect, createServer } from "node:tls";

import "reflect-metadata";
import * as x509 from "@peculiar/x509";

import { createCertificateAuthority, issueServerCertificate } from "../infra-secrets/x509.js";
import {
  buildRedisAclFile,
  ensureRedisSecrets,
  redisCertificateNames,
  redisSecretPaths,
} from "./redis-secrets.js";

const ALTNAMES_HOSTNAME_PATTERN = /altnames|Hostname/iu;
const CERTIFICATE_ALERT_CLOSED_PATTERN = /certificate|alert|closed/iu;

type Pair = { cert: string; key: string };

function quietLog(): (message: string) => void {
  return () => undefined;
}

/**
 * Completes a TLS handshake that trusts only `ca`, as the API does with ioredis. Without a
 * servername the client verifies the connect host, `127.0.0.1`, against the certificate.
 */
async function handshake(
  serverCertPem: string,
  serverKeyPem: string,
  caPem: string,
  servername?: string,
): Promise<void> {
  const server = createServer({ cert: serverCertPem, key: serverKeyPem }, (socket) => {
    socket.end();
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = connect(
        {
          ca: caPem,
          host: "127.0.0.1",
          port: address.port,
          ...(servername ? { servername } : {}),
        },
        () => {
          socket.end();
          resolve();
        },
      );
      socket.on("error", reject);
    });
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

/**
 * Mutual TLS handshake: the server requires a client certificate signed by `ca`. Resolves with
 * the common name of the client the server accepted.
 */
async function mutualHandshake(options: {
  ca: string;
  client?: Pair;
  server: Pair;
  servername?: string;
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
        ...(options.servername ? { servername: options.servername } : {}),
        ...(options.client ? { cert: options.client.cert, key: options.client.key } : {}),
      });
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

function extendedKeyUsages(certificatePem: string): string[] {
  const certificate = new x509.X509Certificate(certificatePem);
  return certificate.getExtension(x509.ExtendedKeyUsageExtension)?.usages ?? [];
}

describe("redis secrets", () => {
  const roots: string[] = [];

  after(async () => {
    await Promise.all(
      roots.map((createdRoot) => rm(createdRoot, { force: true, recursive: true })),
    );
  });

  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "bondery-redis-secrets-"));
    roots.push(root);
  });

  async function ensure(
    overrides: { legacyRoot?: string; localDev?: boolean; prefix?: string } = {},
  ) {
    return ensureRedisSecrets({
      chownToContainerUsers: false,
      legacyRoot: overrides.legacyRoot,
      localDev: overrides.localDev,
      log: quietLog(),
      prefix: overrides.prefix ?? "bondery",
      root,
    });
  }

  it("covers the service name, the stack alias and localhost", () => {
    assert.deepEqual(redisCertificateNames("bondery-beta"), {
      dns: ["redis", "localhost", "bondery-beta-redis"],
      ip: ["127.0.0.1"],
    });
  });

  it("stores only the SHA-256 of the password in the ACL file", () => {
    const acl = buildRedisAclFile("pw");
    const digest = createHash("sha256").update("pw").digest("hex");
    assert.equal(acl, `user default on #${digest} ~* &* +@all\n`);
    assert.ok(!acl.includes(" >pw"));
  });

  it("issues a CA-signed certificate that a client trusting only the CA accepts", async () => {
    await ensure();
    const paths = redisSecretPaths(root);
    const ca = await readFile(paths.clientCaFile, "utf8");
    const cert = await readFile(paths.serverCertFile, "utf8");
    const key = await readFile(paths.serverKeyFile, "utf8");

    for (const servername of ["bondery-redis", "redis", undefined]) {
      await handshake(cert, key, ca, servername);
    }
    await assert.doesNotReject(() => handshake(cert, key, ca));
    await assert.rejects(handshake(cert, key, ca, "other-redis"), ALTNAMES_HOSTNAME_PATTERN);
    assert.equal(ca, await readFile(paths.caCertFile, "utf8"));
    assert.ok(!ca.includes("PRIVATE KEY"));
    assert.notEqual(ca, cert);
  });

  it("accepts the API client certificate and rejects a missing or foreign client certificate", async () => {
    await ensure();
    const paths = redisSecretPaths(root);
    const ca = await readFile(paths.serverCaFile, "utf8");
    const server: Pair = {
      cert: await readFile(paths.serverCertFile, "utf8"),
      key: await readFile(paths.serverKeyFile, "utf8"),
    };
    const apiClient: Pair = {
      cert: await readFile(paths.clientCertFile, "utf8"),
      key: await readFile(paths.clientKeyFile, "utf8"),
    };
    const accepted = await mutualHandshake({ ca, client: apiClient, server, servername: "redis" });
    assert.equal(accepted, "Bondery API Redis client");
    await assert.rejects(
      mutualHandshake({ ca, server, servername: "redis" }),
      CERTIFICATE_ALERT_CLOSED_PATTERN,
    );
    const otherAuthority = await createCertificateAuthority({
      commonName: "other",
      validityDays: 30,
    });
    const foreign = await issueServerCertificate({
      authority: otherAuthority,
      clientAuth: true,
      commonName: "foreign",
      names: { dns: ["foreign"], ip: [] },
      validityDays: 30,
    });
    await assert.rejects(
      mutualHandshake({
        ca,
        client: { cert: foreign.certificatePem, key: foreign.privateKeyPem },
        server,
        servername: "redis",
      }),
      CERTIFICATE_ALERT_CLOSED_PATTERN,
    );
  });

  it("issues serverAuth-only server certificates and clientAuth-only client certificates", async () => {
    await ensure();
    const paths = redisSecretPaths(root);
    const serverUsages = extendedKeyUsages(await readFile(paths.serverCertFile, "utf8"));
    assert.ok(serverUsages.includes(x509.ExtendedKeyUsage.serverAuth));
    assert.ok(!serverUsages.includes(x509.ExtendedKeyUsage.clientAuth));
    const apiUsages = extendedKeyUsages(await readFile(paths.clientCertFile, "utf8"));
    assert.ok(apiUsages.includes(x509.ExtendedKeyUsage.clientAuth));
    assert.ok(!apiUsages.includes(x509.ExtendedKeyUsage.serverAuth));
    const healthcheckUsages = extendedKeyUsages(await readFile(paths.healthcheckCertFile, "utf8"));
    assert.ok(healthcheckUsages.includes(x509.ExtendedKeyUsage.clientAuth));
    assert.ok(!healthcheckUsages.includes(x509.ExtendedKeyUsage.serverAuth));
  });

  it("creates secrets once and keeps them on later runs", async () => {
    const paths = redisSecretPaths(root);
    const first = await ensure();
    assert.equal(first.passwordGenerated, true);
    assert.equal(first.serverCertificateGenerated, true);

    const password = (await readFile(paths.clientPasswordFile, "utf8")).trim();
    const ca = await readFile(paths.caCertFile, "utf8");
    const certificate = await readFile(paths.serverCertFile, "utf8");
    assert.ok(password.length >= 40);
    assert.equal(await readFile(paths.aclFile, "utf8"), buildRedisAclFile(password));
    assert.equal(await readFile(paths.clientCaFile, "utf8"), ca);
    assert.notEqual(await readFile(paths.clientCaFile, "utf8"), certificate);

    const second = await ensure();
    assert.deepEqual(second, {
      authorityGenerated: false,
      clientCertificatesGenerated: false,
      passwordGenerated: false,
      serverCertificateGenerated: false,
    });
    assert.equal((await readFile(paths.clientPasswordFile, "utf8")).trim(), password);
    assert.equal(await readFile(paths.serverCertFile, "utf8"), certificate);
  });

  it("regenerates the ACL from an operator-provided password", async () => {
    const paths = redisSecretPaths(root);
    await mkdir(paths.clientDir, { recursive: true });
    await writeFile(paths.clientPasswordFile, "operator-chosen\n");
    await ensure();
    assert.equal(await readFile(paths.aclFile, "utf8"), buildRedisAclFile("operator-chosen"));
  });

  it("copies a legacy password when the CA and client password are absent", async () => {
    const legacyRoot = await mkdtemp(join(tmpdir(), "bondery-redis-legacy-"));
    roots.push(legacyRoot);
    await mkdir(join(legacyRoot, "client"), { recursive: true });
    await writeFile(join(legacyRoot, "client", "password"), "migrated-password\n");
    await ensure({ legacyRoot });
    assert.equal(
      (await readFile(redisSecretPaths(root).clientPasswordFile, "utf8")).trim(),
      "migrated-password",
    );
  });

  it("generates a new password when the CA exists and client password is absent", async () => {
    const paths = redisSecretPaths(root);
    await ensure();
    const firstPassword = (await readFile(paths.clientPasswordFile, "utf8")).trim();
    assert.ok(firstPassword.length >= 40);

    await rm(paths.clientPasswordFile);
    const second = await ensure();
    assert.equal(second.passwordGenerated, true);
    const secondPassword = (await readFile(paths.clientPasswordFile, "utf8")).trim();
    assert.notEqual(secondPassword, firstPassword);
  });

  it("keeps the secrets private to their owner in a deployed stack", {
    skip: process.platform === "win32",
  }, async () => {
    const privateRoot = await mkdtemp(join(tmpdir(), "bondery-redis-private-"));
    roots.push(privateRoot);
    await ensureRedisSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root: privateRoot,
    });
    const paths = redisSecretPaths(privateRoot);
    assert.equal((await stat(paths.serverKeyFile)).mode & 0o777, 0o600);
    assert.equal((await stat(paths.clientKeyFile)).mode & 0o777, 0o600);
    assert.equal((await stat(paths.clientPasswordFile)).mode & 0o777, 0o600);
    assert.equal((await stat(paths.serverDir)).mode & 0o777, 0o700);
    assert.equal((await stat(paths.clientDir)).mode & 0o777, 0o700);
    assert.equal((await stat(paths.caDir)).mode & 0o777, 0o700);
  });

  it("makes local dev secrets readable by the Redis container user", {
    skip: process.platform === "win32",
  }, async () => {
    const devRoot = await mkdtemp(join(tmpdir(), "bondery-redis-dev-"));
    roots.push(devRoot);
    await ensureRedisSecrets({
      chownToContainerUsers: false,
      localDev: true,
      log: quietLog(),
      prefix: "bondery",
      root: devRoot,
    });
    const paths = redisSecretPaths(devRoot);
    assert.equal((await stat(paths.serverKeyFile)).mode & 0o777, 0o644);
    assert.equal((await stat(paths.healthcheckKeyFile)).mode & 0o777, 0o644);
    assert.equal((await stat(paths.aclFile)).mode & 0o777, 0o644);
    assert.equal((await stat(paths.serverPasswordFile)).mode & 0o777, 0o644);
    assert.equal((await stat(paths.clientKeyFile)).mode & 0o777, 0o600);
    assert.equal((await stat(paths.clientPasswordFile)).mode & 0o777, 0o600);
    assert.equal((await stat(paths.serverDir)).mode & 0o777, 0o755);
    assert.equal((await stat(paths.clientDir)).mode & 0o777, 0o755);
  });
});
