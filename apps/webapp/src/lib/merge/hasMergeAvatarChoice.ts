import type { Contact } from "@bondery/schemas";

function isDefinedAvatar(avatar: string | null): boolean {
  return Boolean(avatar && avatar.trim().length > 0);
}

export function bothHaveDefinedAvatars(
  left: Pick<Contact, "avatar"> | null,
  right: Pick<Contact, "avatar"> | null,
): boolean {
  return Boolean(left && right && isDefinedAvatar(left.avatar) && isDefinedAvatar(right.avatar));
}

/** True when merge should offer an avatar choice (at least one photo is defined). */
export function hasMergeAvatarChoice(
  left: Pick<Contact, "avatar"> | null,
  right: Pick<Contact, "avatar"> | null,
): boolean {
  if (!left || !right) {
    return false;
  }

  return isDefinedAvatar(left.avatar) || isDefinedAvatar(right.avatar);
}
