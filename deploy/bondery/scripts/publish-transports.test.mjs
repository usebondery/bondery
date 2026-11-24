import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../traefik/publish-transports.sh");

const API_CA =
  "-----BEGIN CERTIFICATE-----\nMIIBdzCCAR2gAwIBAgIUAPI\nQ0EgZm9yIHRlc3Rz\n-----END CERTIFICATE-----\n";
const STORAGE_CA =
  "-----BEGIN CERTIFICATE-----\nMIIBdzCCAR2gAwIBAgIUU1RP\nU3RvcmFnZSBDQQ==\n-----END CERTIFICATE-----\n";
const STORAGE_CLIENT_CERT =
  "-----BEGIN CERTIFICATE-----\nMIIBdzCCAR2gAwIBAgIUQ0xJ\nRU5U\n-----END CERTIFICATE-----\n";
const STORAGE_CLIENT_KEY =
  "-----BEGIN PRIVATE KEY-----\nMIIBdzCCAR2gAwIBAgIUQUJD\nS0VZ\n-----END PRIVATE KEY-----\n";

const API_TRANSPORT_NAME_RE = /^ {4}bondery-beta-api:$/m;
const API_SERVER_NAME_RE = /^ {6}serverName: bondery-beta-api$/m;
const STORAGE_SERVER_NAME_RE = /^ {6}serverName: bondery-beta-storage$/m;

/**
 * A serversTransport accepts `certFile` and `keyFile` only. An inline `cert`/`key` pair is not part
 * of the schema, and Traefik rejects the whole file with "field not found, node: cert", which
 * drops the router and leaves the public domain on Traefik's own 404.
 */
const STORAGE_CERT_FILE_RE = /^ {8}- certFile: .*bondery-beta-storage-client\.crt$/m;
const STORAGE_KEY_FILE_RE = /^ {10}keyFile: .*bondery-beta-storage-client\.key$/m;
/** The CA is inline under rootCAs: a rootCAs path that Traefik cannot read fails silently. */
const STORAGE_ROOT_CA_INLINE_RE =
  /^ {6}rootCAs:\n {8}- \|\n {10}-----BEGIN CERTIFICATE-----\n {10}MIIBdzCCAR2gAwIBAgIUU1RP$/m;
/** Only the client pair is forbidden inline: a serversTransport has no inline `cert` field. */
const INLINE_CERT_KEY_RE = /^\s+(?:- )?cert: \||^\s+key: \|/m;

/** Every file path the transport YAML references, in the forms the job writes. */
const REFERENCED_PATH_RE = /(?:- |certFile: |keyFile: )(\/[^\s]+)/g;

const PREFIX_CHARSET_ERROR_RE = /lowercase letters, digits, and dashes/;
const UNKNOWN_SERVICE_RE = /unknown service/;
const NO_CERTIFICATE_RE = /has no certificate/;
const NO_PRIVATE_KEY_RE = /has no private key/;
const DYNAMIC_DIR_ERROR_RE = /BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR/;
const PERMISSION_BITS_RE = /[0-7]{3}$/;

/** PEM shape and a distinctive body marker, so a copy is proven to be the source's bytes. */
const BEGIN_CERTIFICATE_RE = /-----BEGIN CERTIFICATE-----/;
const BEGIN_PRIVATE_KEY_RE = /-----BEGIN PRIVATE KEY-----/;
const STORAGE_CA_BODY_RE = /U3RvcmFnZSBDQQ==/;
const STORAGE_CERT_BODY_RE = /RU5U/;
const STORAGE_KEY_BODY_RE = /S0VZ/;

/**
 * The job runs under `/bin/sh` in a busybox container, so these tests exercise it the same way.
 * A Windows workstation has no `sh`; CI runs on Linux. Skipping there is honest, because the
 * platform-independent guard for this bug lives in `check-compose-storage-tls.mjs`, which forbids
 * an inline cert on every platform.
 */
const shAvailable = spawnSync("sh", ["-c", "exit 0"]).status === 0;
const requiresSh = shAvailable
  ? {}
  : { skip: "needs a POSIX sh, which the job's busybox image provides (CI runs on Linux)" };

describe("publish-transports.sh", requiresSh, () => {
  let root;
  let apiCa;
  let storageCa;
  let storageClientCert;
  let storageClientKey;
  let dynamicDir;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "bondery-traefik-transport-"));
    apiCa = join(root, "api-ca.crt");
    storageCa = join(root, "storage-ca.crt");
    storageClientCert = join(root, "tls.crt");
    storageClientKey = join(root, "tls.key");
    dynamicDir = join(root, "dynamic");
    await writeFile(apiCa, API_CA);
    await writeFile(storageCa, STORAGE_CA);
    await writeFile(storageClientCert, STORAGE_CLIENT_CERT);
    await writeFile(storageClientKey, STORAGE_CLIENT_KEY);
    await mkdir(dynamicDir);
    // Traefik's folder holds other files (Dokploy's routes, acme.json); the job must not touch them.
    await writeFile(join(dynamicDir, "acme.json"), "{}");
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  const run = (prefix, args = [dynamicDir, `api=${apiCa}`, `storage=${storageCa}`]) =>
    spawnSync("sh", [SCRIPT, ...args], {
      encoding: "utf8",
      env: { ...process.env, BONDERY_INFRA_TRAEFIK_PREFIX: prefix },
    });

  it("writes one serversTransport per service, named after the stack", async () => {
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);

    const api = await readFile(join(dynamicDir, "bondery-beta-api-transport.yml"), "utf8");
    assert.match(api, API_TRANSPORT_NAME_RE);
    assert.match(api, API_SERVER_NAME_RE);

    const storage = await readFile(join(dynamicDir, "bondery-beta-storage-transport.yml"), "utf8");
    assert.match(storage, STORAGE_SERVER_NAME_RE);

    assert.equal(await readFile(join(dynamicDir, "acme.json"), "utf8"), "{}");
  });

  it("references the storage client certificate by path, never inline", async () => {
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);
    const storage = await readFile(join(dynamicDir, "bondery-beta-storage-transport.yml"), "utf8");

    assert.match(storage, STORAGE_CERT_FILE_RE);
    assert.match(storage, STORAGE_KEY_FILE_RE);
    assert.equal(
      INLINE_CERT_KEY_RE.test(storage),
      false,
      "an inline cert/key pair is not part of the serversTransport schema",
    );
    assert.equal(
      storage.includes("BEGIN PRIVATE KEY"),
      false,
      "the key must be a path, never inline data",
    );
  });

  it("inlines the CA under rootCAs, because a rootCAs path fails silently", async () => {
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);
    const storage = await readFile(join(dynamicDir, "bondery-beta-storage-transport.yml"), "utf8");

    assert.match(storage, STORAGE_ROOT_CA_INLINE_RE);
    assert.equal(
      storage.includes("bondery-beta-storage-ca.crt"),
      false,
      "the CA is inline, so the job must not also copy it into the watched folder",
    );
  });

  it("copies the client certificate material into the folder Traefik reads", async () => {
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);

    const cert = await readFile(join(dynamicDir, "bondery-beta-storage-client.crt"), "utf8");
    assert.match(cert, BEGIN_CERTIFICATE_RE);
    assert.match(cert, STORAGE_CERT_BODY_RE);

    const key = await readFile(join(dynamicDir, "bondery-beta-storage-client.key"), "utf8");
    assert.match(key, BEGIN_PRIVATE_KEY_RE);
    assert.match(key, STORAGE_KEY_BODY_RE);
  });

  it("every path the transport names exists in that folder", async () => {
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);

    const referencedPaths = async (service) => {
      const transport = await readFile(
        join(dynamicDir, `bondery-beta-${service}-transport.yml`),
        "utf8",
      );
      return [...transport.matchAll(REFERENCED_PATH_RE)].map((match) => match[1]);
    };

    // The API transport is fully inline (CA only), so it names no file.
    assert.deepEqual(await referencedPaths("api"), []);
    // The storage transport names its client certificate and key, and both must exist: a dangling
    // path is exactly the failure that took the beta storage router down.
    const storagePaths = await referencedPaths("storage");
    assert.equal(storagePaths.length, 2);
    for (const path of storagePaths) {
      await stat(path);
    }
  });

  it("gives the api transport no client certificate, because that listener asks for none", async () => {
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);
    const api = await readFile(join(dynamicDir, "bondery-beta-api-transport.yml"), "utf8");
    assert.equal(api.includes("certificates:"), false);
    assert.equal(api.includes("PRIVATE KEY"), false);
  });

  it("writes the transport file with mode 0600 and the key 0600, the cert 0644", {
    skip: process.platform === "win32",
  }, async () => {
    const result = run("bondery-beta-mode");
    assert.equal(result.status, 0, result.stderr);
    const permissionsOf = async (name) =>
      (await stat(join(dynamicDir, name))).mode.toString(8).match(PERMISSION_BITS_RE)?.[0];

    assert.equal(await permissionsOf("bondery-beta-mode-storage-transport.yml"), "600");
    assert.equal(await permissionsOf("bondery-beta-mode-storage-client.key"), "600");
    assert.equal(await permissionsOf("bondery-beta-mode-storage-client.crt"), "644");
  });

  it("leaves up-to-date files alone, so Traefik does not reload", async () => {
    const target = join(dynamicDir, "bondery-beta-api-transport.yml");
    const mtimeBefore = (await stat(target)).mtimeMs;
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.match(/up to date/g)?.length, 2);
    assert.equal((await stat(target)).mtimeMs, mtimeBefore);
  });

  it("publishes exactly the transport files and their certificate material", async () => {
    const result = run("bondery-isolation");
    assert.equal(result.status, 0, result.stderr);
    const written = (await readdir(dynamicDir)).filter((name) =>
      name.startsWith("bondery-isolation"),
    );
    assert.deepEqual(written.sort(), [
      "bondery-isolation-api-transport.yml",
      "bondery-isolation-storage-client.crt",
      "bondery-isolation-storage-client.key",
      "bondery-isolation-storage-transport.yml",
    ]);
  });

  it("refuses a prefix that could escape the folder or break the YAML", () => {
    for (const prefix of ["../evil", "Bondery", "a b", "-x", "a:b"]) {
      const result = run(prefix);
      assert.notEqual(result.status, 0, prefix);
      assert.match(result.stderr, PREFIX_CHARSET_ERROR_RE);
    }
  });

  it("publishes only known services", () => {
    const result = run("bondery", [dynamicDir, `../../etc/evil=${apiCa}`]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, UNKNOWN_SERVICE_RE);
  });

  it("fails loudly without a CA, a client certificate, or Traefik's folder", async () => {
    const noCa = run("bondery", [dynamicDir, `api=${join(root, "missing.crt")}`]);
    assert.notEqual(noCa.status, 0);
    assert.match(noCa.stderr, NO_CERTIFICATE_RE);

    const noFolder = run("bondery", [join(root, "no-traefik"), `api=${apiCa}`]);
    assert.notEqual(noFolder.status, 0);
    assert.match(noFolder.stderr, DYNAMIC_DIR_ERROR_RE);

    // The gateway requires a client certificate, so a storage CA with no certificate next to it
    // must stop the deploy instead of publishing a transport that cannot reach the gateway.
    const lonelyDir = join(root, "lonely");
    const lonelyCa = join(lonelyDir, "ca.crt");
    await mkdir(lonelyDir, { recursive: true });
    await writeFile(lonelyCa, STORAGE_CA);
    const noClient = run("bondery", [dynamicDir, `storage=${lonelyCa}`]);
    assert.notEqual(noClient.status, 0);
    assert.match(noClient.stderr, NO_CERTIFICATE_RE);
  });

  it("refuses a storage client key that is not a private key", async () => {
    const badDir = join(root, "bad-key");
    await mkdir(badDir, { recursive: true });
    const badCa = join(badDir, "ca.crt");
    await writeFile(badCa, STORAGE_CA);
    await writeFile(join(badDir, "tls.crt"), STORAGE_CLIENT_CERT);
    await writeFile(join(badDir, "tls.key"), "not a key\n");
    const result = run("bondery", [dynamicDir, `storage=${badCa}`]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, NO_PRIVATE_KEY_RE);
  });
});
