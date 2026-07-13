export type AvatarPreset = "small" | "medium" | "large";

const AVATAR_PRESETS: Record<AvatarPreset, { avatarSize: string; avatarQuality: string }> = {
  large: { avatarQuality: "high", avatarSize: "large" },
  medium: { avatarQuality: "medium", avatarSize: "medium" },
  small: { avatarQuality: "low", avatarSize: "small" },
};

/**
 * Appends avatarSize and avatarQuality query params to existing URLSearchParams.
 *
 * @param params - The URLSearchParams instance to mutate.
 * @param preset - Named size preset: small (64px), medium (128px), or large (256px).
 */
export function appendAvatarParams(params: URLSearchParams, preset: AvatarPreset): void {
  const { avatarSize, avatarQuality } = AVATAR_PRESETS[preset];
  params.set("avatarSize", avatarSize);
  params.set("avatarQuality", avatarQuality);
}

/**
 * Builds a standalone query string with avatar transform params.
 * Useful for endpoints that otherwise have no query params.
 *
 * @param preset - Named size preset.
 * @returns Query string like "avatarSize=small&avatarQuality=low".
 */
export function buildAvatarQueryString(preset: AvatarPreset): string {
  const params = new URLSearchParams();
  appendAvatarParams(params, preset);
  return params.toString();
}
