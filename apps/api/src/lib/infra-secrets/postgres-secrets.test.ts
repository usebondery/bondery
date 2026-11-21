import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";
import { connect, createServer } from "node:tls";

import {
  ensurePostgresSecrets,
  POSTGRES_SERVER_RENEW_BEFORE_DAYS,
  postgresCertificateNames,
  postgresSecretPaths,
} from "./postgres-secrets.js";
import { createCertificateAuthority, DAY_MS, issueServerCertificate } from "./x509.js";

function quietLog(): (message: string) => void {
  return () => undefined;
}

/**
 * Completes a TLS handshake that trusts only `caPem`, as the API's `pg` pool does. The client
 * verifies `servername` (or the connect host, 127.0.0.1) against the server certificate.
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

describe("postgres secrets", () => {
  const roots: string[] = [];

  async function freshRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "bondery-postgres-secrets-"));
    roots.push(root);
    return root;
  }

  after(async () => {
    await Promise.all(
      roots.map((createdRoot) => rm(createdRoot, { force: true, recursive: true })),
    );
  });

  let root: string;
  beforeEach(async () => {
    root = await freshRoot();
  });

  it("covers the service name, the stack alias, localhost and loopback", () => {
    assert.deepEqual(postgresCertificateNames("bondery-beta"), {
      dns: ["db", "localhost", "bondery-beta-db"],
      ip: ["127.0.0.1"],
    });
  });

  it("issues a CA-signed certificate that a client trusting only the CA accepts", async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    const paths = postgresSecretPaths(root);
    const ca = await readFile(paths.clientCaFile, "utf8");
    const cert = await readFile(paths.serverCertFile, "utf8");
    const key = await readFile(paths.serverKeyFile, "utf8");

    for (const servername of ["bondery-db", "db", "localhost", undefined]) {
      await handshake(cert, key, ca, servername);
    }
    // The client copy of the server certificate is public and matches what the server serves.
    assert.equal(await readFile(paths.clientServerCertFile, "utf8"), cert);
    // The CA private key never lands in the client directory.
    assert.ok(!(await readFile(paths.clientCaFile, "utf8")).includes("PRIVATE KEY"));
  });

  it("rejects a hostname the certificate does not cover", async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    const paths = postgresSecretPaths(root);
    await assert.rejects(
      handshake(
        await readFile(paths.serverCertFile, "utf8"),
        await readFile(paths.serverKeyFile, "utf8"),
        await readFile(paths.clientCaFile, "utf8"),
        "other-db",
      ),
      /altnames|Hostname/,
    );
  });

  it("rejects a server certificate from another CA", async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    const paths = postgresSecretPaths(root);
    const otherAuthority = await createCertificateAuthority({
      commonName: "other",
      validityDays: 30,
    });
    const foreign = await issueServerCertificate({
      authority: otherAuthority,
      commonName: "foreign",
      names: postgresCertificateNames("bondery"),
      validityDays: 30,
    });
    await assert.rejects(
      handshake(
        foreign.certificatePem,
        foreign.privateKeyPem,
        await readFile(paths.clientCaFile, "utf8"),
        "bondery-db",
      ),
      /certificate/,
    );
  });

  it("keeps a valid CA and certificate on later runs", async () => {
    const options = { chownToContainerUsers: false, log: quietLog(), prefix: "bondery", root };
    const first = await ensurePostgresSecrets(options);
    assert.deepEqual(first, { authorityGenerated: true, serverCertificateGenerated: true });
    const paths = postgresSecretPaths(root);
    const caBefore = await readFile(paths.caCertFile, "utf8");
    const certBefore = await readFile(paths.serverCertFile, "utf8");

    const second = await ensurePostgresSecrets(options);
    assert.deepEqual(second, { authorityGenerated: false, serverCertificateGenerated: false });
    assert.equal(await readFile(paths.caCertFile, "utf8"), caBefore);
    assert.equal(await readFile(paths.serverCertFile, "utf8"), certBefore);
  });

  it("reissues only the server certificate when the stack prefix changes", async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    const paths = postgresSecretPaths(root);
    const caBefore = await readFile(paths.caCertFile, "utf8");

    const messages: string[] = [];
    const result = await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: (message) => {
        messages.push(message);
      },
      prefix: "bondery-beta",
      root,
    });
    assert.deepEqual(result, { authorityGenerated: false, serverCertificateGenerated: true });
    assert.equal(await readFile(paths.caCertFile, "utf8"), caBefore);
    assert.ok(messages.some((message) => message.includes("does not cover bondery-beta-db")));
    assert.ok(messages.some((message) => message.includes("--force-recreate db api")));
    await handshake(
      await readFile(paths.serverCertFile, "utf8"),
      await readFile(paths.serverKeyFile, "utf8"),
      caBefore,
      "bondery-beta-db",
    );
  });

  it("reissues the server certificate before it expires", async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    const tenYearsLater = new Date(
      Date.now() + (10 * 365 - POSTGRES_SERVER_RENEW_BEFORE_DAYS + 1) * DAY_MS,
    );
    const result = await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      now: tenYearsLater,
      prefix: "bondery",
      root,
    });
    assert.equal(result.serverCertificateGenerated, true);
    assert.equal(result.authorityGenerated, false);
  });

  it("reissues the server certificate when the CA was replaced", async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    const paths = postgresSecretPaths(root);
    await rm(paths.caKeyFile);
    const result = await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    assert.deepEqual(result, { authorityGenerated: true, serverCertificateGenerated: true });
    await handshake(
      await readFile(paths.serverCertFile, "utf8"),
      await readFile(paths.serverKeyFile, "utf8"),
      await readFile(paths.clientCaFile, "utf8"),
      "bondery-db",
    );
  });

  it("replaces a server certificate that cannot be parsed", async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    await writeFile(postgresSecretPaths(root).serverCertFile, "not a certificate");
    const result = await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    assert.equal(result.serverCertificateGenerated, true);
  });

  it("keeps private keys private to their owner", {
    skip: process.platform === "win32",
  }, async () => {
    await ensurePostgresSecrets({
      chownToContainerUsers: false,
      log: quietLog(),
      prefix: "bondery",
      root,
    });
    const paths = postgresSecretPaths(root);
    for (const path of [paths.caKeyFile, paths.serverKeyFile]) {
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    }
    for (const dir of [paths.caDir, paths.serverDir]) {
      assert.equal((await stat(dir)).mode & 0o777, 0o700);
    }
  });
});
