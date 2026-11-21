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

describe("publish-transports.sh", () => {
  let root;
  let apiCa;
  let storageCa;
  let dynamicDir;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), "bondery-traefik-transport-"));
    apiCa = join(root, "api-ca.crt");
    storageCa = join(root, "storage-ca.crt");
    dynamicDir = join(root, "dynamic");
    await writeFile(apiCa, API_CA);
    await writeFile(storageCa, STORAGE_CA);
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
    assert.match(api, /^ {4}bondery-beta-api:$/m);
    assert.match(api, /^ {6}serverName: bondery-beta-api$/m);
    assert.match(
      api,
      /^ {8}- \|\n {10}-----BEGIN CERTIFICATE-----\n {10}MIIBdzCCAR2gAwIBAgIUAPI$/m,
    );
    const storage = await readFile(join(dynamicDir, "bondery-beta-storage-transport.yml"), "utf8");
    assert.match(storage, /^ {6}serverName: bondery-beta-storage$/m);
    assert.match(storage, /^ {10}MIIBdzCCAR2gAwIBAgIUU1RP$/m);
    assert.deepEqual((await readdir(dynamicDir)).sort(), [
      "acme.json",
      "bondery-beta-api-transport.yml",
      "bondery-beta-storage-transport.yml",
    ]);
    assert.equal(await readFile(join(dynamicDir, "acme.json"), "utf8"), "{}");
  });

  it("leaves up-to-date files alone, so Traefik does not reload", async () => {
    const target = join(dynamicDir, "bondery-beta-api-transport.yml");
    const mtimeBefore = (await stat(target)).mtimeMs;
    const result = run("bondery-beta");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.match(/up to date/g)?.length, 2);
    assert.equal((await stat(target)).mtimeMs, mtimeBefore);
  });

  it("refuses a prefix that could escape the folder or break the YAML", () => {
    for (const prefix of ["../evil", "Bondery", "a b", "-x", "a:b"]) {
      const result = run(prefix);
      assert.notEqual(result.status, 0, prefix);
      assert.match(result.stderr, /lowercase letters, digits, and dashes/);
    }
  });

  it("publishes only known services", () => {
    const result = run("bondery", [dynamicDir, `../../etc/evil=${apiCa}`]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unknown service/);
  });

  it("fails loudly without a CA or without Traefik's folder", () => {
    const noCa = run("bondery", [dynamicDir, `api=${join(root, "missing.crt")}`]);
    assert.notEqual(noCa.status, 0);
    assert.match(noCa.stderr, /has no certificate/);

    const noFolder = run("bondery", [join(root, "no-traefik"), `api=${apiCa}`]);
    assert.notEqual(noFolder.status, 0);
    assert.match(noFolder.stderr, /BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR/);
  });
});
