import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer, request } from "node:https";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";

import { apiCertificateNames, apiSecretPaths, ensureApiSecrets } from "./api-secrets.js";

const ALTNAMES_HOSTNAME_PATTERN = /altnames|Hostname/u;

/** An HTTPS request that trusts only `ca`, as the webapp does, to `servername`. */
async function requestWithCa(paths: ReturnType<typeof apiSecretPaths>, servername: string) {
  const server = createServer(
    {
      cert: await readFile(paths.serverCertFile, "utf8"),
      key: await readFile(paths.serverKeyFile, "utf8"),
    },
    (_req, res) => {
      res.end("ok");
    },
  );
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const ca = await readFile(paths.clientCaFile, "utf8");
  try {
    return await new Promise<number>((resolve, reject) => {
      const req = request(
        {
          agent: false,
          ca,
          host: "127.0.0.1",
          port: (server.address() as AddressInfo).port,
          servername,
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on("error", reject);
      req.end();
    });
  } finally {
    server.close();
  }
}

describe("aPI secrets", () => {
  const roots: string[] = [];
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "bondery-api-secrets-"));
    roots.push(root);
  });

  after(async () => {
    await Promise.all(roots.map((path) => rm(path, { force: true, recursive: true })));
  });

  const ensure = (prefix = "bondery", log: (message: string) => void = () => undefined) =>
    ensureApiSecrets({ chownToContainerUsers: false, log, prefix, root });

  it("covers the service name, the stack alias, localhost and loopback", () => {
    assert.deepEqual(apiCertificateNames("bondery-beta"), {
      dns: ["api", "localhost", "bondery-beta-api"],
      ip: ["127.0.0.1"],
    });
  });

  it("issues a certificate that a client trusting only the CA accepts", async () => {
    await ensure();
    const paths = apiSecretPaths(root);
    for (const servername of ["bondery-api", "api", "localhost"]) {
      assert.equal(await requestWithCa(paths, servername), 200);
    }
    await assert.rejects(requestWithCa(paths, "bondery-webapp"), ALTNAMES_HOSTNAME_PATTERN);
    assert.ok(!(await readFile(paths.clientCaFile, "utf8")).includes("PRIVATE KEY"));
  });

  it("keeps a valid CA and certificate, and reissues on a prefix change", async () => {
    assert.deepEqual(await ensure(), { authorityGenerated: true, certificateGenerated: true });
    assert.deepEqual(await ensure(), { authorityGenerated: false, certificateGenerated: false });

    const messages: string[] = [];
    const result = await ensure("bondery-beta", (message) => {
      messages.push(message);
    });
    assert.deepEqual(result, { authorityGenerated: false, certificateGenerated: true });
    assert.ok(messages.some((message) => message.includes("--force-recreate api webapp")));
    assert.equal(await requestWithCa(apiSecretPaths(root), "bondery-beta-api"), 200);
  });

  it("keeps the private keys private to their owner", {
    skip: process.platform === "win32",
  }, async () => {
    await ensure();
    const paths = apiSecretPaths(root);
    for (const path of [paths.caKeyFile, paths.serverKeyFile]) {
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    }
    for (const path of [paths.caDir, paths.serverDir]) {
      assert.equal((await stat(path)).mode & 0o777, 0o700);
    }
  });
});
