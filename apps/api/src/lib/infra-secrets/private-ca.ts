/**
 * A private CA and the one certificate it signs, kept on disk by the `stack-secrets` job.
 * Postgres (postgres-secrets.ts) and SeaweedFS (storage-secrets.ts) each get their own CA, so a
 * client that trusts one service's CA trusts nothing else in the stack.
 *
 * Idempotent: it keeps a valid CA and certificate. It replaces the CA when it is missing,
 * unparsable, or expires within a year, and it reissues the certificate when it is missing,
 * unparsable, expires soon, misses a name or a required usage, or was signed by another CA.
 * The caller creates the directories and decides who may read them.
 */

import { readOptional, writeAtomic } from "./files.js";
import {
  type CertificateNames,
  type CertificateWithKey,
  certificateCoverageReason,
  certificateIssuerMismatch,
  createCertificateAuthority,
  issueServerCertificate,
} from "./x509.js";

const DAYS_PER_YEAR = 365;
const CA_VALIDITY_YEARS = 20;
const CERTIFICATE_VALIDITY_YEARS = 10;
const CA_VALIDITY_DAYS = CA_VALIDITY_YEARS * DAYS_PER_YEAR;
const CA_RENEW_BEFORE_DAYS = DAYS_PER_YEAR;
export const CERTIFICATE_VALIDITY_DAYS = CERTIFICATE_VALIDITY_YEARS * DAYS_PER_YEAR;

export type CaSignedCertificatePaths = {
  caCertFile: string;
  caKeyFile: string;
  certFile: string;
  keyFile: string;
};

export type EnsureCaSignedCertificateOptions = {
  authorityCommonName: string;
  certificateCommonName: string;
  /** The certificate also authenticates its holder as a client (mutual TLS). */
  clientAuth?: boolean;
  /** Service name in log lines, for example "Postgres". */
  label: string;
  log: (message: string) => void;
  names: CertificateNames;
  now?: Date;
  paths: CaSignedCertificatePaths;
  renewBeforeDays: number;
};

export type EnsureCaSignedCertificateResult = {
  authority: CertificateWithKey;
  authorityGenerated: boolean;
  certificateGenerated: boolean;
  /** An older certificate was replaced, so a running server still serves the old one. */
  replacedExisting: boolean;
};

async function readPair(certFile: string, keyFile: string): Promise<CertificateWithKey | null> {
  const certificatePem = await readOptional(certFile);
  const privateKeyPem = await readOptional(keyFile);
  return certificatePem && privateKeyPem ? { certificatePem, privateKeyPem } : null;
}

function authorityReplacementReason(
  authority: CertificateWithKey | null,
  now: Date | undefined,
): string | null {
  if (!authority) {
    return "CA is missing";
  }
  return certificateCoverageReason(authority.certificatePem, {
    names: { dns: [], ip: [] },
    now,
    renewBeforeDays: CA_RENEW_BEFORE_DAYS,
  });
}

async function certificateReplacementReason(
  certificate: CertificateWithKey | null,
  authority: CertificateWithKey,
  options: EnsureCaSignedCertificateOptions,
): Promise<string | null> {
  if (!certificate) {
    return "certificate is missing";
  }
  return (
    certificateCoverageReason(certificate.certificatePem, {
      clientAuth: options.clientAuth,
      names: options.names,
      now: options.now,
      renewBeforeDays: options.renewBeforeDays,
    }) ?? (await certificateIssuerMismatch(certificate.certificatePem, authority.certificatePem))
  );
}

export async function ensureCaSignedCertificate(
  options: EnsureCaSignedCertificateOptions,
): Promise<EnsureCaSignedCertificateResult> {
  const { paths } = options;

  let authority = await readPair(paths.caCertFile, paths.caKeyFile);
  const authorityReason = authorityReplacementReason(authority, options.now);
  const authorityGenerated = authorityReason !== null;
  if (authorityGenerated || !authority) {
    authority = await createCertificateAuthority({
      commonName: options.authorityCommonName,
      now: options.now,
      validityDays: CA_VALIDITY_DAYS,
    });
    await writeAtomic(paths.caKeyFile, authority.privateKeyPem, 0o600);
    await writeAtomic(paths.caCertFile, authority.certificatePem, 0o644);
    options.log(`Generated a new ${options.label} CA (${authorityReason})`);
  }

  const existing = await readPair(paths.certFile, paths.keyFile);
  const reason = await certificateReplacementReason(existing, authority, options);
  const certificateGenerated = reason !== null;
  if (certificateGenerated) {
    const issued = await issueServerCertificate({
      authority,
      clientAuth: options.clientAuth,
      commonName: options.certificateCommonName,
      names: options.names,
      now: options.now,
      validityDays: CERTIFICATE_VALIDITY_DAYS,
    });
    await writeAtomic(paths.keyFile, issued.privateKeyPem, 0o600);
    await writeAtomic(paths.certFile, issued.certificatePem, 0o644);
    const names = [...options.names.dns, ...options.names.ip].join(", ");
    options.log(`Generated a new ${options.label} TLS certificate (${reason}) for ${names}`);
  }

  return {
    authority,
    authorityGenerated,
    certificateGenerated,
    replacedExisting: certificateGenerated && existing !== null,
  };
}
