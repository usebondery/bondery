import { buildAndroidAssetLinks } from "@bondery/helpers/auth/associated-domains";

export const dynamic = "force-dynamic";

/**
 * Android Digital Asset Links for App Links and passkeys. Returns 404 when
 * `BONDERY_PUBLIC_ANDROID_SHA256_CERT_FINGERPRINTS` has no valid fingerprint.
 */
export function GET() {
  const links = buildAndroidAssetLinks({
    fingerprintsCsv: process.env.BONDERY_PUBLIC_ANDROID_SHA256_CERT_FINGERPRINTS,
  });

  if (!links) {
    return new Response(null, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 404,
    });
  }

  return Response.json(links, {
    headers: {
      "Cache-Control": "max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
