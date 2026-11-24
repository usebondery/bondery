"use client";

type SettingsCredentialIconImgProps = {
  onError?: () => void;
  src: string;
};

/** Remote or data-URI credential icons (passkey catalog, OAuth `logo_uri`). */
export const SETTINGS_CREDENTIAL_ICON_PX = 18;

export function SettingsCredentialIconImg({ onError, src }: SettingsCredentialIconImgProps) {
  return (
    // Catalog icons are often data: SVG URIs — next/image cannot optimize them.
    // biome-ignore lint/performance/noImgElement: small brand icons; external HTTPS URLs
    <img
      alt=""
      aria-hidden
      height={SETTINGS_CREDENTIAL_ICON_PX}
      onError={onError}
      src={src}
      width={SETTINGS_CREDENTIAL_ICON_PX}
    />
  );
}
