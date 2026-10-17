import { parseAndroidSha256CertFingerprints } from "./resolve-webauthn-origins.js";

/** Android application id and iOS bundle identifier for the Expo app. */
export const MOBILE_APP_PACKAGE_ID = "com.usebondery.mobile";

const APPLE_TEAM_ID_PATTERN = /^[A-Z0-9]{10}$/;

export type AppleAppSiteAssociation = {
  applinks: {
    apps: [];
    details: Array<{ appID: string; paths: string[] }>;
  };
  webcredentials: {
    apps: string[];
  };
};

export type AndroidAssetLink = {
  relation: string[];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export type BuildAppleAppSiteAssociationInput = {
  bundleId?: string | undefined;
  teamId: string | undefined;
};

export type BuildAndroidAssetLinksInput = {
  fingerprintsCsv: string | undefined;
  packageName?: string | undefined;
};

/**
 * Apple associated-domain document for passkeys (`webcredentials`) and
 * universal links (`applinks`). Returns null when the team id is missing or
 * invalid so the host can fail closed with 404.
 */
export function buildAppleAppSiteAssociation(
  input: BuildAppleAppSiteAssociationInput,
): AppleAppSiteAssociation | null {
  const teamId = input.teamId?.trim().toUpperCase();
  if (!teamId || !APPLE_TEAM_ID_PATTERN.test(teamId)) {
    return null;
  }

  const bundleId = input.bundleId?.trim() || MOBILE_APP_PACKAGE_ID;
  const appID = `${teamId}.${bundleId}`;

  return {
    applinks: {
      apps: [],
      details: [{ appID, paths: ["*"] }],
    },
    webcredentials: {
      apps: [appID],
    },
  };
}

/**
 * Digital Asset Links for Android App Links and passkeys. Returns null when
 * no valid SHA-256 fingerprint is configured.
 */
export function buildAndroidAssetLinks(
  input: BuildAndroidAssetLinksInput,
): AndroidAssetLink[] | null {
  const fingerprints = parseAndroidSha256CertFingerprints(input.fingerprintsCsv);
  if (fingerprints.length === 0) {
    return null;
  }

  const packageName = input.packageName?.trim() || MOBILE_APP_PACKAGE_ID;

  return [
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds",
      ],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
