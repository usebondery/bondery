import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { createCertificateAuthority, issueServerCertificate } from "../infra-secrets/x509.js";
import {
  createS3Client,
  describeS3Security,
  resolveS3TrustedCa,
  S3_TLS_CA_FILE_ENV,
} from "./s3-client.js";
import {
  inspectObjectStorageTls,
  logStorageCertificateExpiry,
  warnOnInsecureProductionStorage,
} from "./storage-tls.js";

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
    port = address.port;
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
    await assert.rejects(headBucket(`https://localhost:${port}`, {}), /certificate/i);
  });

  it("refuses the endpoint when the CA file holds another CA", async () => {
    await assert.rejects(
      headBucket(`https://localhost:${port}`, { [S3_TLS_CA_FILE_ENV]: otherCaFile }),
      /certificate/i,
    );
  });

  it("refuses a CA file with a plaintext endpoint", () => {
    assert.throws(
      () => resolveS3TrustedCa("http://localhost:8333", { [S3_TLS_CA_FILE_ENV]: caFile }),
      /does not use TLS/,
    );
  });

  it("explains an unreadable or empty CA file", () => {
    assert.throws(
      () =>
        resolveS3TrustedCa("https://localhost:8443", {
          [S3_TLS_CA_FILE_ENV]: join(dir, "missing.crt"),
        }),
      /cannot read/,
    );
    assert.throws(
      () =>
        resolveS3TrustedCa("https://localhost:8443", { [S3_TLS_CA_FILE_ENV]: "ca.crt" }, () => ""),
      /no PEM certificate/,
    );
  });

  it("rejects an endpoint that is not an http(s) URL", () => {
    assert.throws(() => describeS3Security("localhost:8333", {}), /must start with https/);
    assert.throws(() => describeS3Security("not a url", {}), /not a valid URL/);
  });

  it("describes the connection without reading files", () => {
    assert.deepEqual(describeS3Security("https://s3.example.com", {}), {
      privateCa: false,
      tls: true,
    });
    assert.deepEqual(
      describeS3Security("https://bondery-storage:8443", { [S3_TLS_CA_FILE_ENV]: "/nope.crt" }),
      { privateCa: true, tls: true },
    );
  });

  it("inspects the TLS session the client would use", async () => {
    const inspection = await inspectObjectStorageTls(`https://localhost:${port}`, {
      [S3_TLS_CA_FILE_ENV]: caFile,
    });
    assert.equal(inspection.tls, true);
    assert.match(inspection.version ?? "", /^TLSv1\.[23]$/);
    assert.ok(inspection.certificateDaysLeft !== null && inspection.certificateDaysLeft >= 29);

    assert.deepEqual(await inspectObjectStorageTls("http://localhost:8333", {}), {
      certificateDaysLeft: null,
      tls: false,
      version: null,
    });
    await assert.rejects(
      inspectObjectStorageTls(`https://localhost:${port}`, { [S3_TLS_CA_FILE_ENV]: otherCaFile }),
      /certificate/i,
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
