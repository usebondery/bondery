import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { connect, createServer } from "node:tls";

import {
  buildRedisAclFile,
  certificateReplacementReason,
  ensureRedisSecrets,
  generateRedisCertificate,
  redisCertificateHostnames,
  redisSecretPaths,
} from "./redis-secrets.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function quietLog(): (message: string) => void {
  return () => undefined;
}

/**
 * Completes a TLS handshake that trusts only `ca`, as the API does with ioredis. Without a
 * servername the client verifies the connect host, `127.0.0.1`, against the certificate.
 */
async function handshake(
  certificatePem: string,
  privateKeyPem: string,
  servername?: string,
): Promise<void> {
  const server = createServer({ cert: certificatePem, key: privateKeyPem }, (socket) => {
    socket.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = connect(
        {
          ca: certificatePem,
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("redis secrets", () => {
  let root: string;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "bondery-redis-secrets-"));
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it("covers the service name, the stack alias and localhost", () => {
    assert.deepEqual(redisCertificateHostnames("bondery-beta"), [
      "redis",
      "localhost",
      "bondery-beta-redis",
    ]);
  });

  it("stores only the SHA-256 of the password in the ACL file", () => {
    const acl = buildRedisAclFile("pw");
    const digest = createHash("sha256").update("pw").digest("hex");
    assert.equal(acl, `user default on #${digest} ~* &* +@all\n`);
    assert.ok(!acl.includes(" >pw"));
  });

  it("issues a certificate that a pinned TLS client accepts for each hostname", async () => {
    const certificate = await generateRedisCertificate(redisCertificateHostnames("bondery"));
    await handshake(certificate.certificatePem, certificate.privateKeyPem, "bondery-redis");
    await handshake(certificate.certificatePem, certificate.privateKeyPem, "redis");
    await assert.rejects(
      handshake(certificate.certificatePem, certificate.privateKeyPem, "other-redis"),
      /altnames|Hostname/i,
    );
  });

  it("also accepts the loopback address that local dev connects to", async () => {
    const certificate = await generateRedisCertificate(redisCertificateHostnames("bondery"));
    await handshake(certificate.certificatePem, certificate.privateKeyPem);
  });

  it("replaces a certificate that expires soon or misses a hostname", async () => {
    const hostnames = redisCertificateHostnames("bondery");
    const certificate = await generateRedisCertificate(hostnames);
    assert.equal(certificateReplacementReason(certificate.certificatePem, hostnames), null);
    assert.match(
      certificateReplacementReason(
        certificate.certificatePem,
        redisCertificateHostnames("bondery-beta"),
      ) ?? "",
      /bondery-beta-redis/,
    );
    const nearExpiry = new Date(Date.now() + 3640 * DAY_MS);
    assert.match(
      certificateReplacementReason(certificate.certificatePem, hostnames, nearExpiry) ?? "",
      /expires soon/,
    );
  });

  it("creates secrets once and keeps them on later runs", async () => {
    const paths = redisSecretPaths(root);
    const first = await ensureRedisSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    assert.deepEqual(first, { certificateGenerated: true, passwordGenerated: true });

    const password = (await readFile(paths.passwordFile, "utf8")).trim();
    const certificate = await readFile(paths.serverCertFile, "utf8");
    assert.ok(password.length >= 40);
    assert.equal(await readFile(paths.aclFile, "utf8"), buildRedisAclFile(password));
    assert.equal(await readFile(paths.caFile, "utf8"), certificate);

    const second = await ensureRedisSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    assert.deepEqual(second, { certificateGenerated: false, passwordGenerated: false });
    assert.equal((await readFile(paths.passwordFile, "utf8")).trim(), password);
    assert.equal(await readFile(paths.serverCertFile, "utf8"), certificate);
  });

  it("regenerates the ACL from an operator-provided password", async () => {
    const paths = redisSecretPaths(root);
    await writeFile(paths.passwordFile, "operator-chosen\n");
    await ensureRedisSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    assert.equal(await readFile(paths.aclFile, "utf8"), buildRedisAclFile("operator-chosen"));
  });

  it("keeps the secrets private to their owner in a deployed stack", {
    skip: process.platform === "win32",
  }, async () => {
    const privateRoot = await mkdtemp(join(tmpdir(), "bondery-redis-private-"));
    try {
      await ensureRedisSecrets({
        chownToContainerUsers: false,
        log: quietLog(),
        prefix: "bondery",
        root: privateRoot,
      });
      const paths = redisSecretPaths(privateRoot);
      assert.equal((await stat(paths.serverKeyFile)).mode & 0o777, 0o600);
      assert.equal((await stat(paths.passwordFile)).mode & 0o777, 0o600);
      assert.equal((await stat(paths.serverDir)).mode & 0o777, 0o700);
    } finally {
      await rm(privateRoot, { force: true, recursive: true });
    }
  });

  it("makes local dev secrets readable by the Redis container user", {
    skip: process.platform === "win32",
  }, async () => {
    const devRoot = await mkdtemp(join(tmpdir(), "bondery-redis-dev-"));
    try {
      await ensureRedisSecrets({
        chownToContainerUsers: false,
        localDev: true,
        log: quietLog(),
        prefix: "bondery",
        root: devRoot,
      });
      const paths = redisSecretPaths(devRoot);
      assert.equal((await stat(paths.serverKeyFile)).mode & 0o777, 0o644);
      assert.equal((await stat(paths.aclFile)).mode & 0o777, 0o644);
      assert.equal((await stat(paths.passwordFile)).mode & 0o777, 0o644);
      assert.equal((await stat(paths.serverDir)).mode & 0o777, 0o755);
      assert.equal((await stat(paths.clientDir)).mode & 0o777, 0o755);
    } finally {
      await rm(devRoot, { force: true, recursive: true });
    }
  });
});
