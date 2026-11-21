/**
 * X.509 helpers for the secrets the `stack-secrets` Compose job creates for bundled services
 * (Redis, Postgres, SeaweedFS). Pure functions over PEM strings; no file system access.
 *
 * All keys are ECDSA P-256 and all signatures are ECDSA with SHA-256. Every TLS client the
 * stack uses accepts them: Node, the Prisma schema engine, libpq (psql, pg_dump), Go (SeaweedFS,
 * also in its FIPS 140-3 mode), and curl.
 */

import { randomBytes } from "node:crypto";

// @peculiar/x509 3 resolves its internals through tsyringe, which refuses to load without a
// Reflect metadata polyfill. This import must stay first: ESM runs imports in source order.
import "reflect-metadata";
import * as x509 from "@peculiar/x509";

export const DAY_MS = 24 * 60 * 60 * 1000;

const ECDSA_KEY: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const ECDSA_SIGNING: EcdsaParams = { hash: "SHA-256", name: "ECDSA" };

export type CertificateWithKey = {
  certificatePem: string;
  privateKeyPem: string;
};

export type CertificateNames = {
  dns: string[];
  ip: string[];
};

function selectWebCryptoProvider(): void {
  x509.cryptoProvider.set(globalThis.crypto);
}

export function toPem(label: string, der: ArrayBuffer): string {
  const base64 = Buffer.from(der).toString("base64");
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/** Entropy of a certificate serial number, in bytes. */
const SERIAL_NUMBER_BYTES = 16;

/** Positive serial number: the high bit of the first byte must be clear. */
function serialNumber(): string {
  return randomBytes(SERIAL_NUMBER_BYTES)
    .toString("hex")
    .replace(/^[89a-f]/, "1");
}

function subjectAlternativeNames(names: CertificateNames): x509.SubjectAlternativeNameExtension {
  return new x509.SubjectAlternativeNameExtension([
    ...names.dns.map((value) => ({ type: "dns" as const, value })),
    ...names.ip.map((value) => ({ type: "ip" as const, value })),
  ]);
}

async function generateKeys(): Promise<CryptoKeyPair> {
  selectWebCryptoProvider();
  return globalThis.crypto.subtle.generateKey(ECDSA_KEY, true, ["sign", "verify"]);
}

async function exportPrivateKey(keys: CryptoKeyPair): Promise<string> {
  const der = await globalThis.crypto.subtle.exportKey("pkcs8", keys.privateKey);
  return toPem("PRIVATE KEY", der);
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  selectWebCryptoProvider();
  const base64 = privateKeyPem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  return globalThis.crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(base64, "base64"),
    ECDSA_KEY,
    false,
    ["sign"],
  );
}

function validity(now: Date, validityDays: number): { notAfter: Date; notBefore: Date } {
  return {
    notAfter: new Date(now.getTime() + validityDays * DAY_MS),
    // A day of slack for clock skew between the job and the clients.
    notBefore: new Date(now.getTime() - DAY_MS),
  };
}

/**
 * Self-signed server certificate that clients pin as their only trusted CA. Used for Redis,
 * where the API is the only client.
 */
export async function createSelfSignedServerCertificate(options: {
  commonName: string;
  names: CertificateNames;
  now?: Date;
  validityDays: number;
}): Promise<CertificateWithKey> {
  const keys = await generateKeys();
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyCertSign,
        true,
      ),
      new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.serverAuth]),
      subjectAlternativeNames(options.names),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
    keys,
    name: `CN=${options.commonName}`,
    ...validity(options.now ?? new Date(), options.validityDays),
    serialNumber: serialNumber(),
    signingAlgorithm: ECDSA_SIGNING,
  });
  return {
    certificatePem: certificate.toString("pem"),
    privateKeyPem: await exportPrivateKey(keys),
  };
}

/** Private certificate authority. It signs server certificates and nothing else. */
export async function createCertificateAuthority(options: {
  commonName: string;
  now?: Date;
  validityDays: number;
}): Promise<CertificateWithKey> {
  const keys = await generateKeys();
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    extensions: [
      // CA, and it may only sign end-entity certificates (path length 0).
      new x509.BasicConstraintsExtension(true, 0, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
        true,
      ),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
    keys,
    name: `CN=${options.commonName}`,
    ...validity(options.now ?? new Date(), options.validityDays),
    serialNumber: serialNumber(),
    signingAlgorithm: ECDSA_SIGNING,
  });
  return {
    certificatePem: certificate.toString("pem"),
    privateKeyPem: await exportPrivateKey(keys),
  };
}

/**
 * End-entity certificate signed by `authority`. Server authentication only, unless `clientAuth`
 * is set: then the same certificate also authenticates its holder as a client (mutual TLS
 * between the nodes of one cluster).
 */
export async function issueServerCertificate(options: {
  authority: CertificateWithKey;
  clientAuth?: boolean;
  commonName: string;
  names: CertificateNames;
  now?: Date;
  validityDays: number;
}): Promise<CertificateWithKey> {
  const keys = await generateKeys();
  const authorityCertificate = new x509.X509Certificate(options.authority.certificatePem);
  const authorityKey = await importPrivateKey(options.authority.privateKeyPem);
  const usages = options.clientAuth
    ? [x509.ExtendedKeyUsage.serverAuth, x509.ExtendedKeyUsage.clientAuth]
    : [x509.ExtendedKeyUsage.serverAuth];
  const certificate = await x509.X509CertificateGenerator.create({
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
      new x509.ExtendedKeyUsageExtension(usages),
      subjectAlternativeNames(options.names),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
      await x509.AuthorityKeyIdentifierExtension.create(authorityCertificate),
    ],
    issuer: authorityCertificate.subject,
    publicKey: keys.publicKey,
    serialNumber: serialNumber(),
    signingAlgorithm: ECDSA_SIGNING,
    signingKey: authorityKey,
    subject: `CN=${options.commonName}`,
    ...validity(options.now ?? new Date(), options.validityDays),
  });
  return {
    certificatePem: certificate.toString("pem"),
    privateKeyPem: await exportPrivateKey(keys),
  };
}

export type CoverageCheck = {
  /** The certificate must also allow client authentication (mutual TLS). */
  clientAuth?: boolean;
  names: CertificateNames;
  now?: Date;
  renewBeforeDays: number;
};

function allowsClientAuth(certificate: x509.X509Certificate): boolean {
  const usages = certificate.getExtension(x509.ExtendedKeyUsageExtension)?.usages ?? [];
  return usages.includes(x509.ExtendedKeyUsage.clientAuth);
}

/**
 * Why an existing certificate must be replaced because of its own content (unparsable, expiring,
 * missing a name, or missing client authentication), or null when it is still good.
 */
export function certificateCoverageReason(
  certificatePem: string,
  check: CoverageCheck,
):
  | "certificate cannot be parsed"
  | "certificate expires soon"
  | "certificate does not allow client authentication"
  | `certificate does not cover ${string}`
  | null {
  selectWebCryptoProvider();
  let certificate: x509.X509Certificate;
  try {
    certificate = new x509.X509Certificate(certificatePem);
  } catch {
    return "certificate cannot be parsed";
  }
  const now = check.now ?? new Date();
  if (certificate.notAfter.getTime() - now.getTime() < check.renewBeforeDays * DAY_MS) {
    return "certificate expires soon";
  }
  const san = certificate.getExtension(x509.SubjectAlternativeNameExtension);
  const items = san?.names.items ?? [];
  const coveredDns = new Set(items.filter((name) => name.type === "dns").map((name) => name.value));
  const coveredIp = new Set(items.filter((name) => name.type === "ip").map((name) => name.value));
  const missing = [
    ...check.names.dns.filter((name) => !coveredDns.has(name)),
    ...check.names.ip.filter((name) => !coveredIp.has(name)),
  ];
  if (missing.length > 0) {
    return `certificate does not cover ${missing.join(", ")}`;
  }
  if (check.clientAuth && !allowsClientAuth(certificate)) {
    return "certificate does not allow client authentication";
  }
  return null;
}

/** Null when `certificatePem` is signed by `issuerCertificatePem`, otherwise the reason. */
export async function certificateIssuerMismatch(
  certificatePem: string,
  issuerCertificatePem: string,
): Promise<string | null> {
  selectWebCryptoProvider();
  let certificate: x509.X509Certificate;
  let issuer: x509.X509Certificate;
  try {
    certificate = new x509.X509Certificate(certificatePem);
    issuer = new x509.X509Certificate(issuerCertificatePem);
  } catch {
    return "certificate or CA cannot be parsed";
  }
  const signedByIssuer = await certificate.verify({
    publicKey: issuer.publicKey,
    signatureOnly: true,
  });
  return signedByIssuer ? null : "certificate is not signed by the current CA";
}

/** Days until the certificate expires (negative when expired), or null when it cannot be parsed. */
export function certificateDaysLeft(certificatePem: string, now: Date = new Date()): number | null {
  selectWebCryptoProvider();
  try {
    const certificate = new x509.X509Certificate(certificatePem);
    return Math.floor((certificate.notAfter.getTime() - now.getTime()) / DAY_MS);
  } catch {
    return null;
  }
}
