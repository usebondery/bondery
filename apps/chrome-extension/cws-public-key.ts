import { createHash } from "node:crypto";

/** Chrome Web Store item id — must match BONDERY_INFRA_CHROME_EXTENSION_ID. */
export const CWS_EXTENSION_ID = "lpcmokfekjjejnpobhbkgmjkodfhpmha";

/**
 * SPKI public key from the published CRX. Unpacked local builds set
 * `manifest.key` to this so chrome.identity's redirect URI matches the
 * OAuth client provisioned from BONDERY_INFRA_CHROME_EXTENSION_ID.
 * Omit from CI store zips — Chrome Web Store supplies the key on upload.
 */
export const CWS_EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6LMxqNRvxxtargM92o3ktu4ZKbS88Gn+2L/hhOwWsItK8rKYC8OSaw37i9wdnXYU34c+N/SWKiVDEiW1St7eIEnXrOlqkaeeTbtF3r0MIA1ZWPlkSG6QgXTGFD0h7iG6aBDuWxTfhauLFdS6T4U9Nxh9riAS7OFBeB5Asi+fZAdlXbGa0Xy4WgnxuR1f8NFJ5pSFn0u8+6fun3F1Ug4ksYDG7hBIraqSm8Cwsiyn1ZnBEPic/WaihT2VqVLK5QE4wHGtLdY2dTNX/qmWC7zSg5xYS66I6EfySyLScuH67FPMMZ8xRHkh6GSwoo3Kcrb/pdEquFOPJe2+8VpsFiWtnQIDAQAB";

/** Chrome derives the extension id from the first 16 bytes of the key's SHA-256 digest. */
const EXTENSION_ID_DIGEST_BYTES = 16;

export function chromeExtensionIdFromPublicKey(spkiDerBase64: string): string {
  const digest = createHash("sha256").update(Buffer.from(spkiDerBase64, "base64")).digest();
  let id = "";
  for (let i = 0; i < EXTENSION_ID_DIGEST_BYTES; i += 1) {
    const byte = digest[i];
    if (byte === undefined) {
      throw new Error(`SHA-256 digest was shorter than ${EXTENSION_ID_DIGEST_BYTES} bytes`);
    }
    id += String.fromCharCode(97 + (byte >> 4));
    id += String.fromCharCode(97 + (byte & 0x0f));
  }
  return id;
}
