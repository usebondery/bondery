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

const API_TRANSPORT_NAME_RE = /^ {4}bondery-beta-api:$/mu;
const API_SERVER_NAME_RE = /^ {6}serverName: bondery-beta-api$/mu;
const API_CA_INLINE_RE =
  /^ {8}- \|\n {10}-----BEGIN CERTIFICATE-----\n {10}MIIBdzCCAR2gAwIBAgIUAPI$/mu;
const STORAGE_SERVER_NAME_RE = /^ {6}serverName: bondery-beta-storage$/mu;
const STORAGE_CA_INLINE_RE = /^ {10}MIIBdzCCAR2gAwIBAgIUU1RP$/mu;
const STORAGE_CLIENT_CERT_INLINE_RE =
  /^ {6}certificates:\n {8}- cert: \|\n {12}-----BEGIN CERTIFICATE-----$/mu;
const STORAGE_CLIENT_KEY_INLINE_RE = /^ {10}key: \|\n {12}-----BEGIN PRIVATE KEY-----$/mu;
const STORAGE_CLIENT_CERT_BODY_RE = /^ {12}RU5U$/mu;
const PREFIX_CHARSET_ERROR_RE = /lowercase letters, digits, and dashes/u;
const UNKNOWN_SERVICE_RE = /unknown service/u;
const NO_CERTIFICATE_RE = /has no certificate/u;
const NO_PRIVATE_KEY_RE = /has no private key/u;
const DYNAMIC_DIR_ERROR_RE = /BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR/u;
const PERMISSION_BITS_RE = /[0-7]{3}$/u;

describe("publish-transports.sh", () => {
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

  it("writes one serversTransport per service, with its CA inline, named after the stack", async () => {
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);
    const api = await readFile(join(dynamicDir, "bondery-beta-api-transport.yml"), "utf8");
    assert.match(api, API_TRANSPORT_NAME_RE);
    assert.match(api, API_SERVER_NAME_RE);
    assert.match(api, API_CA_INLINE_RE);
    const storage = await readFile(join(dynamicDir, "bondery-beta-storage-transport.yml"), "utf8");
    assert.match(storage, STORAGE_SERVER_NAME_RE);
    assert.match(storage, STORAGE_CA_INLINE_RE);
    assert.deepEqual((await readdir(dynamicDir)).sort(), [
      "acme.json",
      "bondery-beta-api-transport.yml",
      "bondery-beta-storage-transport.yml",
    ]);
    assert.equal(await readFile(join(dynamicDir, "acme.json"), "utf8"), "{}");
  });

  it("gives the storage transport a client certificate, and the api transport none", async () => {
    const result = run("bondery-beta-client");
    assert.equal(result.status, 0, result.stderr);
    const storage = await readFile(
      join(dynamicDir, "bondery-beta-client-storage-transport.yml"),
      "utf8",
    );
    assert.match(storage, STORAGE_CLIENT_CERT_INLINE_RE);
    assert.match(storage, STORAGE_CLIENT_KEY_INLINE_RE);
    assert.ok(
      STORAGE_CLIENT_CERT_BODY_RE.test(storage),
      "the client certificate is inlined as data bytes, not a path",
    );

    const api = await readFile(join(dynamicDir, "bondery-beta-client-api-transport.yml"), "utf8");
    assert.ok(!api.includes("certificates:"), "the API listener does not ask for a certificate");
    assert.ok(!api.includes("PRIVATE KEY"));
  });

  it("writes the transport file with mode 0600, because it holds a private key", {
    skip: process.platform === "win32",
  }, async () => {
    const result = run("bondery-beta-mode");
    assert.equal(result.status, 0, result.stderr);
    const target = join(dynamicDir, "bondery-beta-mode-storage-transport.yml");
    // `stat` reports the full file type and mode; the permission bits are its last three digits.
    const permissions = (await stat(target)).mode.toString(8).match(PERMISSION_BITS_RE)?.[0];
    assert.equal(permissions, "600");
  });

  it("leaves up-to-date files alone, so Traefik does not reload", async () => {
    const target = join(dynamicDir, "bondery-beta-api-transport.yml");
    const mtimeBefore = (await stat(target)).mtimeMs;
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.match(/up to date/gu)?.length, 2);
    assert.equal((await stat(target)).mtimeMs, mtimeBefore);
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
