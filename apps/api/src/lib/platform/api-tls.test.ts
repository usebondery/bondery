import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { connect } from "node:tls";

import websocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";

import { createCertificateAuthority, issueServerCertificate } from "../infra-secrets/x509.js";
import {
  API_TLS_CERT_FILE_ENV,
  API_TLS_KEY_FILE_ENV,
  type ApiTlsConfig,
  apiCertificateDaysLeft,
  loadApiTlsOptions,
  resolveApiTlsConfig,
  resolveListenAddress,
} from "./api-tls.js";

type Reply = { body: string; headers: Record<string, unknown>; status: number };

function get(
  send: typeof httpsRequest | typeof httpRequest,
  options: Record<string, unknown>,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = send({ host: "127.0.0.1", method: "GET", ...options }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ body, headers: res.headers, status: res.statusCode ?? 0 });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

describe("aPI TLS config", () => {
  it("requires both the certificate and the key: there is no plain HTTP fallback", () => {
    assert.throws(() => resolveApiTlsConfig({}), /HTTPS only.*api:secrets/);
    assert.throws(() => resolveApiTlsConfig({ [API_TLS_CERT_FILE_ENV]: "/tls.crt" }), /HTTPS only/);
    assert.throws(() => resolveApiTlsConfig({ [API_TLS_KEY_FILE_ENV]: "/tls.key" }), /HTTPS only/);
    assert.deepEqual(
      resolveApiTlsConfig({
        [API_TLS_CERT_FILE_ENV]: "/tls.crt",
        [API_TLS_KEY_FILE_ENV]: "/tls.key",
      }),
      { certFile: "/tls.crt", keyFile: "/tls.key" },
    );
  });

  it("explains a missing certificate file and how to create one", () => {
    assert.throws(
      () =>
        loadApiTlsOptions({
          certFile: join(tmpdir(), "bondery-missing", "tls.crt"),
          keyFile: join(tmpdir(), "bondery-missing", "tls.key"),
        }),
      /BONDERY_PRIVATE_API_TLS_CERT_FILE points to a file the API cannot read.*api:secrets/,
    );
  });

  it("refuses a file without PEM data", () => {
    assert.throws(
      () => loadApiTlsOptions({ certFile: "/tls.crt", keyFile: "/tls.key" }, () => "not a pem"),
      /no PEM data/,
    );
  });
});

describe("aPI listen address", () => {
  it("binds loopback in development and all interfaces elsewhere", () => {
    const config = { API_HOST: "", API_PORT: 26642 };
    assert.deepEqual(resolveListenAddress(config, "development"), {
      host: "127.0.0.1",
      port: 26642,
    });
    assert.deepEqual(resolveListenAddress(config, "production"), { host: "0.0.0.0", port: 26642 });
  });

  it("keeps an explicit API_HOST", () => {
    assert.equal(
      resolveListenAddress({ API_HOST: "0.0.0.0", API_PORT: 26642 }, "development").host,
      "0.0.0.0",
    );
  });
});

describe("aPI HTTPS server", () => {
  let dir: string;
  let ca: string;
  let config: ApiTlsConfig;
  let app: FastifyInstance;
  let port: number;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "bondery-api-tls-"));
    const authority = await createCertificateAuthority({
      commonName: "test API CA",
      validityDays: 30,
    });
    const leaf = await issueServerCertificate({
      authority,
      commonName: "api",
      names: { dns: ["localhost", "bondery-api"], ip: ["127.0.0.1"] },
      validityDays: 30,
    });
    ca = authority.certificatePem;
    config = { certFile: join(dir, "tls.crt"), keyFile: join(dir, "tls.key") };
    await writeFile(config.certFile, leaf.certificatePem);
    await writeFile(config.keyFile, leaf.privateKeyPem);

    // The same `https` option buildApp() passes for the running API.
    app = Fastify({ https: loadApiTlsOptions(config), logger: false });
    app.addHook("onRequest", async (_request, reply) => {
      reply.header("x-hook", "ran");
    });
    app.get("/whoami", async (request) => ({ protocol: request.protocol }));
    await app.register(websocket);
    app.get("/ws", { websocket: true }, (socket) => {
      socket.send("hello over wss");
    });
    await app.listen({ host: "127.0.0.1", port: 0 });
    port = (app.server.address() as AddressInfo).port;
  });

  after(async () => {
    await app.close();
    await rm(dir, { force: true, recursive: true });
  });

  it("serves the app, hooks included, over HTTPS under every name the certificate covers", async () => {
    const reply = await get(httpsRequest, { ca, path: "/whoami", port });
    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), { protocol: "https" });
    assert.equal(reply.headers["x-hook"], "ran");

    const viaName = await get(httpsRequest, {
      ca,
      path: "/whoami",
      port,
      servername: "bondery-api",
    });
    assert.equal(viaName.status, 200);
  });

  it("upgrades WebSockets (sync) over TLS", async () => {
    const upgrade = await new Promise<{ firstFrame: string; status: number }>((resolve, reject) => {
      const req = httpsRequest({
        agent: false,
        ca,
        headers: {
          Connection: "Upgrade",
          "Sec-WebSocket-Key": randomBytes(16).toString("base64"),
          "Sec-WebSocket-Version": "13",
          Upgrade: "websocket",
        },
        host: "127.0.0.1",
        path: "/ws",
        port,
      });
      req.on("upgrade", (response, socket) => {
        socket.once("data", (data: Buffer) => {
          resolve({ firstFrame: data.toString("utf8"), status: response.statusCode ?? 0 });
          socket.destroy();
        });
      });
      req.on("response", (response) => {
        reject(new Error(`no upgrade, status ${response.statusCode}`));
      });
      req.on("error", reject);
      req.end();
    });
    assert.equal(upgrade.status, 101);
    assert.match(upgrade.firstFrame, /hello over wss/);
  });

  it("refuses plaintext HTTP", async () => {
    await assert.rejects(get(httpRequest, { agent: false, path: "/whoami", port }));
  });

  it("refuses a client that does not trust the API CA", async () => {
    await assert.rejects(
      get(httpsRequest, { agent: false, path: "/whoami", port }),
      /certificate/i,
    );
  });

  it("refuses TLS 1.2", async () => {
    await assert.rejects(
      new Promise<void>((resolve, reject) => {
        const socket = connect({ ca, host: "127.0.0.1", maxVersion: "TLSv1.2", port }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      }),
      /version|protocol|alert/i,
    );
  });

  it("reads the days left on its certificate", () => {
    const days = apiCertificateDaysLeft(config);
    assert.ok(days !== null && days >= 29 && days <= 30);
    assert.equal(apiCertificateDaysLeft({ ...config, certFile: join(dir, "nope.crt") }), null);
  });
});
