import { prisma } from "@bondery/db";
import logger from "../platform/logger.js";

export function readWebAuthnCredentialId(clientData: unknown): string | undefined {
  if (!clientData || typeof clientData !== "object") {
    return undefined;
  }

  const id = (clientData as { id?: unknown }).id;
  if (typeof id !== "string") {
    return undefined;
  }

  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Best-effort last-used stamp after a verified passkey sign-in.
 * Must not fail the authentication ceremony.
 */
export async function touchPasskeyLastUsed(clientData: unknown): Promise<void> {
  const credentialID = readWebAuthnCredentialId(clientData);
  if (!credentialID) {
    return;
  }

  try {
    await prisma.passkey.update({
      data: { lastUsedAt: new Date() },
      where: { credentialID },
    });
  } catch (error) {
    logger.warn({ err: error }, "[passkey] failed to touch lastUsedAt");
  }
}
