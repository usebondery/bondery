"use client";

/** Remote or data-URI credential icons (passkey catalog, OAuth `logo_uri`). */
export const SETTINGS_CREDENTIAL_ICON_PX = 18;

type SettingsCredentialIconImgProps = {
  src: string;
};

export function SettingsCredentialIconImg({ src }: SettingsCredentialIconImgProps) {
  return (
    // Catalog icons are often data: SVG URIs — next/image cannot optimize them.
    // biome-ignore lint/performance/noImgElement: small brand icons; external HTTPS URLs
    <img
      alt=""
      aria-hidden
      height={SETTINGS_CREDENTIAL_ICON_PX}
      src={src}
      width={SETTINGS_CREDENTIAL_ICON_PX}
    />
  );
}
