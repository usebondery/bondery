import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import {
  createCertificateAuthority,
  issueClientCertificate,
  issueServerCertificate,
} from "../infra-secrets/x509.js";
import {
  createS3Client,
  describeS3Security,
  resolveS3ClientCertificate,
  resolveS3TrustedCa,
  S3_TLS_CA_FILE_ENV,
  S3_TLS_CERT_FILE_ENV,
  S3_TLS_KEY_FILE_ENV,
} from "./s3-client.js";
import {
  inspectObjectStorageTls,
  logStorageCertificateExpiry,
  warnOnInsecureProductionStorage,
} from "./storage-tls.js";

const CERTIFICATE_PATTERN = /certificate/i;
const DOES_NOT_USE_TLS_PATTERN = /does not use TLS/;
const CANNOT_READ_PATTERN = /cannot read/;
const NO_PEM_CERTIFICATE_PATTERN = /no PEM certificate/;
const MUST_START_WITH_HTTPS_PATTERN = /must start with https/;
const NOT_A_VALID_URL_PATTERN = /not a valid URL/;
const TLSV1_PATTERN = /^TLSv1\.[23]$/;
const CLIENT_CERT_REFUSED_RE = /certificate|socket hang up|handshake/i;
const PAIR_REQUIRED_RE = /Set both/;

const CREDENTIALS = { accessKeyId: "test", region: "eu-central-1", secretAccessKey: "test" };

function recordingLog() {
  const calls: Array<{ level: string; message: string }> = [];
  const record = (level: string) => (first: unknown, second?: unknown) => {
    calls.push({ level, message: String(typeof first === "string" ? first : second) });
  };
  return { calls, log: { error: record("error"), warn: record("warn") } };
}

describe("s3 client TLS", () => {
  let dir: string;
  let caFile: string;
  let otherCaFile: string;
  let server: Server;
  let port: number;
  const expectHeaders: string[] = [];

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "bondery-s3-client-"));
    const authority = await createCertificateAuthority({ commonName: "test CA", validityDays: 30 });
    const other = await createCertificateAuthority({ commonName: "other CA", validityDays: 30 });
    const leaf = await issueServerCertificate({
      authority,
      commonName: "storage",
      names: { dns: ["localhost"], ip: ["127.0.0.1"] },
      validityDays: 30,
    });
    caFile = join(dir, "ca.crt");
    otherCaFile = join(dir, "other.crt");
    await writeFile(caFile, authority.certificatePem);
    await writeFile(otherCaFile, other.certificatePem);
    // Stands in for the SeaweedFS S3 gateway on 8443: HeadBucket and PutObject only need a 200.
    server = createServer({ cert: leaf.certificatePem, key: leaf.privateKeyPem }, (req, res) => {
      expectHeaders.push(String(req.headers.expect ?? ""));
      req.resume();
      req.on("end", () => {
        res.writeHead(200).end();
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    ({ port } = address);
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await rm(dir, { force: true, recursive: true });
  });

  async function headBucket(endpoint: string, env: Record<string, string>): Promise<void> {
    const client = createS3Client({ ...CREDENTIALS, endpoint }, {}, env);
    try {
      await client.send(new HeadBucketCommand({ Bucket: "avatars" }));
    } finally {
      client.destroy();
    }
  }

  it("talks to an HTTPS endpoint signed by the CA in the CA file", async () => {
    await assert.doesNotReject(
      headBucket(`https://localhost:${port}`, { [S3_TLS_CA_FILE_ENV]: caFile }),
    );
    await assert.doesNotReject(
      headBucket(`https://127.0.0.1:${port}`, { [S3_TLS_CA_FILE_ENV]: caFile }),
    );
  });

  it("keeps the CA for large uploads that send Expect: 100-continue", async () => {
    expectHeaders.length = 0;
    const client = createS3Client(
      { ...CREDENTIALS, endpoint: `https://localhost:${port}` },
      {},
      { [S3_TLS_CA_FILE_ENV]: caFile },
    );
    try {
      await assert.doesNotReject(
        client.send(
          new PutObjectCommand({
            Body: Buffer.alloc(3 * 1024 * 1024, 1),
            Bucket: "avatars",
            Key: "large.bin",
          }),
        ),
      );
    } finally {
      client.destroy();
    }
    assert.ok(expectHeaders.includes("100-continue"), "the upload sent Expect: 100-continue");
  });

  it("refuses the endpoint without the CA file (system CAs only)", async () => {
    await assert.rejects(headBucket(`https://localhost:${port}`, {}), CERTIFICATE_PATTERN);
  });

  it("refuses the endpoint when the CA file holds another CA", async () => {
    await assert.rejects(
      headBucket(`https://localhost:${port}`, { [S3_TLS_CA_FILE_ENV]: otherCaFile }),
      CERTIFICATE_PATTERN,
    );
  });

  it("refuses a CA file with a plaintext endpoint", () => {
    assert.throws(
      () => resolveS3TrustedCa("http://localhost:8333", { [S3_TLS_CA_FILE_ENV]: caFile }),
      DOES_NOT_USE_TLS_PATTERN,
    );
  });

  it("explains an unreadable or empty CA file", () => {
    assert.throws(
      () =>
        resolveS3TrustedCa("https://localhost:8443", {
          [S3_TLS_CA_FILE_ENV]: join(dir, "missing.crt"),
        }),
      CANNOT_READ_PATTERN,
    );
    assert.throws(
      () =>
        resolveS3TrustedCa("https://localhost:8443", { [S3_TLS_CA_FILE_ENV]: "ca.crt" }, () => ""),
      NO_PEM_CERTIFICATE_PATTERN,
    );
  });

  it("rejects an endpoint that is not an http(s) URL", () => {
    assert.throws(() => describeS3Security("localhost:8333", {}), MUST_START_WITH_HTTPS_PATTERN);
    assert.throws(() => describeS3Security("not a url", {}), NOT_A_VALID_URL_PATTERN);
  });

  it("describes the connection without reading files", () => {
    assert.deepEqual(describeS3Security("https://s3.example.com", {}), {
      mutualTls: false,
      privateCa: false,
      tls: true,
    });
    assert.deepEqual(
      describeS3Security("https://bondery-storage:8443", { [S3_TLS_CA_FILE_ENV]: "/nope.crt" }),
      { mutualTls: false, privateCa: true, tls: true },
    );
  });

  it("inspects the TLS session the client would use", async () => {
    const inspection = await inspectObjectStorageTls(`https://localhost:${port}`, {
      [S3_TLS_CA_FILE_ENV]: caFile,
    });
    assert.equal(inspection.tls, true);
    assert.match(inspection.version ?? "", TLSV1_PATTERN);
    assert.ok(inspection.certificateDaysLeft !== null && inspection.certificateDaysLeft >= 29);

    assert.deepEqual(await inspectObjectStorageTls("http://localhost:8333", {}), {
      certificateDaysLeft: null,
      tls: false,
      version: null,
    });
    await assert.rejects(
      inspectObjectStorageTls(`https://localhost:${port}`, { [S3_TLS_CA_FILE_ENV]: otherCaFile }),
      CERTIFICATE_PATTERN,
    );
  });

  it("warns before the certificate expires", () => {
    const { calls, log } = recordingLog();
    assert.equal(logStorageCertificateExpiry(log, null), null);
    assert.equal(logStorageCertificateExpiry(log, 90), null);
    assert.equal(logStorageCertificateExpiry(log, 89), "warn");
    assert.equal(logStorageCertificateExpiry(log, 13), "error");
    assert.ok(calls.every((call) => call.message.includes("storage_tls_certificate")));
  });

  it("warns only for a plaintext endpoint in production", () => {
    const { calls, log } = recordingLog();
    assert.equal(warnOnInsecureProductionStorage(log, "http://storage:8333", "development"), false);
    assert.equal(warnOnInsecureProductionStorage(log, "https://storage:8443", "production"), false);
    assert.equal(warnOnInsecureProductionStorage(log, "http://storage:8333", "production"), true);
    assert.equal(calls.length, 1);
  });
});

describe("s3 client mutual TLS", () => {
  let dir: string;
  let caFile: string;
  let clientCertFile: string;
  let clientKeyFile: string;
  let foreignCertFile: string;
  let foreignKeyFile: string;
  let server: Server;
  let port: number;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "bondery-s3-mtls-"));
    const authority = await createCertificateAuthority({
      commonName: "storage CA",
      validityDays: 30,
    });
    const foreign = await createCertificateAuthority({ commonName: "other CA", validityDays: 30 });
    const serverLeaf = await issueServerCertificate({
      authority,
      commonName: "storage",
      names: { dns: ["localhost"], ip: ["127.0.0.1"] },
      validityDays: 30,
    });
    const apiClient = await issueClientCertificate({
      authority,
      commonName: "Bondery API storage client",
      names: { dns: ["storage-client-api"], ip: [] },
      validityDays: 30,
    });
    const foreignClient = await issueClientCertificate({
      authority: foreign,
      commonName: "foreign client",
      names: { dns: ["foreign"], ip: [] },
      validityDays: 30,
    });
    caFile = join(dir, "ca.crt");
    clientCertFile = join(dir, "client.crt");
    clientKeyFile = join(dir, "client.key");
    foreignCertFile = join(dir, "foreign.crt");
    foreignKeyFile = join(dir, "foreign.key");
    await writeFile(caFile, authority.certificatePem);
    await writeFile(clientCertFile, apiClient.certificatePem);
    await writeFile(clientKeyFile, apiClient.privateKeyPem);
    await writeFile(foreignCertFile, foreignClient.certificatePem);
    await writeFile(foreignKeyFile, foreignClient.privateKeyPem);
    // Stands in for the gateway: it requires a client certificate from the storage CA, exactly as
    // `-tlsVerifyClientCert` with `-cacert.file` does.
    server = createServer(
      {
        ca: authority.certificatePem,
        cert: serverLeaf.certificatePem,
        key: serverLeaf.privateKeyPem,
        rejectUnauthorized: true,
        requestCert: true,
      },
      (_req, res) => {
        res.writeHead(200).end();
      },
    );
    server.on("tlsClientError", () => undefined);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    ({ port } = address);
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await rm(dir, { force: true, recursive: true });
  });

  async function headBucket(env: Record<string, string>): Promise<void> {
    const client = createS3Client(
      { ...CREDENTIALS, endpoint: `https://localhost:${port}` },
      {},
      env,
    );
    try {
      await client.send(new HeadBucketCommand({ Bucket: "avatars" }));
    } finally {
      client.destroy();
    }
  }

  it("presents the client certificate and reaches a gateway that requires one", async () => {
    await assert.doesNotReject(
      headBucket({
        [S3_TLS_CA_FILE_ENV]: caFile,
        [S3_TLS_CERT_FILE_ENV]: clientCertFile,
        [S3_TLS_KEY_FILE_ENV]: clientKeyFile,
      }),
    );
  });

  it("refuses a gateway that requires a client certificate when none is configured", async () => {
    await assert.rejects(headBucket({ [S3_TLS_CA_FILE_ENV]: caFile }), CERTIFICATE_PATTERN);
  });

  it("refuses a client certificate from another CA", async () => {
    // TLS 1.3 rejects a client certificate after the handshake, so the server closes the
    // connection instead of sending an alert. A refused connection is the assertion that matters.
    await assert.rejects(
      headBucket({
        [S3_TLS_CA_FILE_ENV]: caFile,
        [S3_TLS_CERT_FILE_ENV]: foreignCertFile,
        [S3_TLS_KEY_FILE_ENV]: foreignKeyFile,
      }),
      CLIENT_CERT_REFUSED_RE,
    );
  });

  it("requires the certificate and the key as a pair", () => {
    assert.throws(
      () =>
        resolveS3ClientCertificate("https://storage:8443", {
          [S3_TLS_CERT_FILE_ENV]: clientCertFile,
        }),
      PAIR_REQUIRED_RE,
    );
    assert.throws(
      () =>
        resolveS3ClientCertificate("https://storage:8443", {
          [S3_TLS_KEY_FILE_ENV]: clientKeyFile,
        }),
      PAIR_REQUIRED_RE,
    );
  });

  it("refuses a client certificate with a plaintext endpoint", () => {
    assert.throws(
      () =>
        resolveS3ClientCertificate("http://storage:8333", {
          [S3_TLS_CERT_FILE_ENV]: clientCertFile,
          [S3_TLS_KEY_FILE_ENV]: clientKeyFile,
        }),
      DOES_NOT_USE_TLS_PATTERN,
    );
  });

  it("reports mutual TLS from the environment without reading files", () => {
    assert.equal(
      describeS3Security("https://storage:8443", {
        [S3_TLS_CERT_FILE_ENV]: "/nope.crt",
        [S3_TLS_KEY_FILE_ENV]: "/nope.key",
      }).mutualTls,
      true,
    );
    assert.equal(
      describeS3Security("https://storage:8443", { [S3_TLS_CERT_FILE_ENV]: "/nope.crt" }).mutualTls,
      false,
    );
  });
});
