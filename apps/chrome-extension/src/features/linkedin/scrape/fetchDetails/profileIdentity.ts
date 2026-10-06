/**
 * Voyager identity (name, headline, photo) from GraphQL / embedded entities.
 */

import { looksLikeLinkedInVanityHandle, type SduiIdentity, splitName } from "../sduiProfile";

function nfcText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return value.normalize("NFC");
}

function localizedString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) {
    return record.text.trim();
  }
  if (typeof record.value === "string" && record.value.trim()) {
    return record.value.trim();
  }

  const localized = record.localized;
  if (localized && typeof localized === "object") {
    for (const entry of Object.values(localized as Record<string, unknown>)) {
      if (typeof entry === "string" && entry.trim()) {
        return entry.trim();
      }
    }
  }

  return undefined;
}

function vectorImageUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const vector =
    record.vectorImage && typeof record.vectorImage === "object"
      ? (record.vectorImage as Record<string, unknown>)
      : record;
  const rootUrl = vector.rootUrl;
  const artifacts = vector.artifacts;
  if (typeof rootUrl !== "string" || !Array.isArray(artifacts) || artifacts.length === 0) {
    return undefined;
  }

  let bestSegment: string | undefined;
  let bestWidth = -1;
  for (const artifact of artifacts) {
    if (!artifact || typeof artifact !== "object") {
      continue;
    }
    const item = artifact as Record<string, unknown>;
    if (typeof item.fileIdentifyingUrlPathSegment !== "string") {
      continue;
    }
    const width = typeof item.width === "number" ? item.width : 0;
    if (width >= bestWidth) {
      bestWidth = width;
      bestSegment = item.fileIdentifyingUrlPathSegment;
    }
  }

  return bestSegment ? `${rootUrl}${bestSegment}` : undefined;
}

function photoFromProfileEntity(entity: Record<string, unknown>): string | undefined {
  const picture = entity.profilePicture;
  if (picture && typeof picture === "object") {
    const pic = picture as Record<string, unknown>;
    const fromPicture =
      vectorImageUrl(pic) ??
      vectorImageUrl(pic.displayImageReference) ??
      vectorImageUrl(pic.displayImageReferenceResolutionResult);
    if (fromPicture) {
      return fromPicture;
    }
  }

  return vectorImageUrl(entity.picture);
}

function identityFromProfileEntity(
  entity: Record<string, unknown>,
  handle: string,
): SduiIdentity | null {
  const firstName = localizedString(entity.firstName);
  const lastName = localizedString(entity.lastName);
  const middleName = localizedString(entity.middleName);
  const headline = localizedString(entity.headline);
  const profilePhotoUrl = photoFromProfileEntity(entity);

  if (firstName && !looksLikeLinkedInVanityHandle(firstName, handle)) {
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    return {
      firstName,
      fullName,
      ...(middleName ? { middleName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(headline ? { headline } : {}),
      ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
    };
  }

  const fullName = localizedString(entity.fullName) ?? localizedString(entity.name);
  if (!fullName || looksLikeLinkedInVanityHandle(fullName, handle)) {
    return null;
  }

  const split = splitName(fullName);
  if (!split.firstName || looksLikeLinkedInVanityHandle(split.firstName, handle)) {
    return null;
  }

  return {
    firstName: split.firstName,
    fullName,
    ...(split.middleName ? { middleName: split.middleName } : {}),
    ...(split.lastName ? { lastName: split.lastName } : {}),
    ...(headline ? { headline } : {}),
    ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
  };
}

function entityMatchesProfile(
  entity: Record<string, unknown>,
  username: string,
  profileUrn: string | null,
): boolean {
  const pubId = nfcText(entity.publicIdentifier) ?? nfcText(entity.vanityName);
  const entityUrn = typeof entity.entityUrn === "string" ? entity.entityUrn : undefined;
  if (pubId === username.normalize("NFC")) {
    return true;
  }
  return Boolean(profileUrn && entityUrn === profileUrn);
}

/**
 * Reads first/last name from Voyager Profile or MiniProfile entities.
 * Skips vanity slugs so we never treat `jakub-žemlička-50779a201` as a name.
 */
export function extractVoyagerIdentity(
  entities: Record<string, unknown>[],
  username: string,
  profileUrn: string | null,
): SduiIdentity | null {
  const normalizedUsername = username.normalize("NFC");
  const candidates: Record<string, unknown>[] = [];

  for (const entity of entities) {
    const type = typeof entity.$type === "string" ? entity.$type : undefined;
    if (!type?.includes("identity.profile.Profile") && !type?.includes("MiniProfile")) {
      continue;
    }
    if (/PrivacySettings|ProfileCard/i.test(type)) {
      continue;
    }
    if (entityMatchesProfile(entity, normalizedUsername, profileUrn)) {
      candidates.push(entity);
    }
  }

  if (candidates.length === 0) {
    for (const entity of entities) {
      const type = typeof entity.$type === "string" ? entity.$type : undefined;
      if (!type?.includes("identity.profile.Profile") && !type?.includes("MiniProfile")) {
        continue;
      }
      if (/PrivacySettings|ProfileCard/i.test(type)) {
        continue;
      }
      candidates.push(entity);
    }
  }

  for (const entity of candidates) {
    const identity = identityFromProfileEntity(entity, username);
    if (identity) {
      return identity;
    }
  }

  return null;
}

function firstLocaleValue(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (typeof entry === "string" && entry.trim()) {
      return entry.trim();
    }
  }
  return undefined;
}

function bioFromProfileEntity(entity: Record<string, unknown>): string | undefined {
  const stateful = entity.profileStatefulProfileFields;
  let nested: string | undefined;
  if (stateful && typeof stateful === "object" && !Array.isArray(stateful)) {
    const fields = stateful as Record<string, unknown>;
    nested =
      localizedString(fields.summary) ??
      localizedString(fields.plainTextSummary) ??
      localizedString(fields.about) ??
      firstLocaleValue(fields.multiLocaleSummary);
  }
  return (
    localizedString(entity.summary) ??
    localizedString(entity.plainTextSummary) ??
    localizedString(entity.about) ??
    firstLocaleValue(entity.multiLocaleSummary) ??
    nested
  );
}

function isProfileEntityType(type: unknown, urn: unknown): boolean {
  if (
    typeof type === "string" &&
    type.includes("identity.profile.Profile") &&
    !/PrivacySettings|ProfileCard|MiniProfile/i.test(type)
  ) {
    return true;
  }
  return !type && typeof urn === "string" && /fsd_profile|fs_profile/.test(urn);
}

function isBioProfileCandidate(
  entity: Record<string, unknown>,
  username: string,
  profileUrn: string | null,
): boolean {
  if (isProfileEntityType(entity.$type, entity.entityUrn)) {
    return true;
  }
  return entityMatchesProfile(entity, username, profileUrn);
}

function entityLooksLikeAbout(entity: Record<string, unknown>): boolean {
  const type = typeof entity.$type === "string" ? entity.$type : "";
  const id = `${entity.$id ?? ""} ${entity.entityUrn ?? ""}`;
  if (/PrivacySettings|ProfileCard/i.test(type) || /PrivacySettings/i.test(id)) {
    return false;
  }
  return /profile\.About|ProfileAbout|AboutTopLevel/i.test(`${type} ${id}`);
}

function findExpandableText(value: unknown, depth = 0): string | undefined {
  if (value == null || depth > 8) {
    return undefined;
  }
  if (typeof value !== "object") {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findExpandableText(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const expandable = record.expandableTextComponent ?? record.expandableText;
  if (expandable && typeof expandable === "object") {
    const box = expandable as Record<string, unknown>;
    const text =
      localizedString(box.description) ?? localizedString(box.text) ?? localizedString(box.caption);
    if (text && text.length > 20) {
      return text;
    }
  }

  for (const child of Object.values(record)) {
    const found = findExpandableText(child, depth + 1);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function bioFromAboutEntity(entity: Record<string, unknown>): string | undefined {
  return (
    localizedString(entity.text) ??
    localizedString(entity.summary) ??
    localizedString(entity.description) ??
    findExpandableText(entity)
  );
}

/**
 * Reads the About / summary text from Voyager Profile or About entities.
 * Background enrich tabs often never mount the SDUI About card.
 */
export function extractVoyagerBio(
  entities: Record<string, unknown>[],
  username: string,
  profileUrn: string | null,
): string | undefined {
  const normalizedUsername = username.normalize("NFC");

  let matchedProfile = false;
  for (const entity of entities) {
    if (!isBioProfileCandidate(entity, normalizedUsername, profileUrn)) {
      continue;
    }
    const urn = entity.entityUrn as string | undefined;
    if (!entityMatchesProfile(entity, normalizedUsername, profileUrn) && urn !== profileUrn) {
      continue;
    }
    matchedProfile = true;
    const bio = bioFromProfileEntity(entity);
    if (bio) {
      return bio;
    }
  }

  for (const entity of entities) {
    if (!entityLooksLikeAbout(entity)) {
      continue;
    }
    const bio = bioFromAboutEntity(entity);
    if (bio) {
      return bio;
    }
  }

  if (matchedProfile) {
    return undefined;
  }

  for (const entity of entities) {
    if (!isBioProfileCandidate(entity, normalizedUsername, profileUrn)) {
      continue;
    }
    const unmatchedBio = bioFromProfileEntity(entity);
    if (unmatchedBio) {
      return unmatchedBio;
    }
  }

  return undefined;
}
