/**
 * Profile location resolution via Voyager GraphQL and embedded entities.
 */

import { extLog } from "../../../../lib/log";
import type { SduiIdentity } from "../sduiProfile";
import { extractVoyagerBio, extractVoyagerIdentity } from "./profileIdentity";
import {
  buildEntityByUrn,
  collectIncludedEntities,
  collectVoyagerObjects,
  extractLivePageJsonBlocks,
  extractProfileUrn,
  nfcText,
  type VoyagerEntity,
  voyagerFetch,
} from "./voyagerShared";

const PRIVACY_PROFILE_OR_MINI_RE = /PrivacySettings|ProfileCard|MiniProfile/iu;
function buildGeoEntityMap(entities: VoyagerEntity[]): Map<string, VoyagerEntity> {
  const map = new Map<string, VoyagerEntity>();
  for (const e of entities) {
    const urn = e.entityUrn as string | undefined;
    const type = e.$type as string | undefined;
    if (urn && type?.includes("Geo")) {
      map.set(urn, e);
    }
  }
  return map;
}

function resolveGeoDisplayName(
  geoEntity: VoyagerEntity,
  geoByUrn: Map<string, VoyagerEntity>,
): string | undefined {
  const localized = (geoEntity.defaultLocalizedName ??
    geoEntity.defaultLocalizedNameWithoutCountryName ??
    geoEntity.name) as string | undefined;
  if (localized?.trim()) {
    return localized.trim();
  }

  const cityPart = (geoEntity.defaultLocalizedNameWithoutCountryName as string | undefined)?.trim();
  const countryUrn = geoEntity["*country"] as string | undefined;
  if (countryUrn) {
    const country = geoByUrn.get(countryUrn);
    const countryName = (country?.defaultLocalizedName ?? country?.name) as string | undefined;
    if (cityPart && countryName?.trim()) {
      return `${cityPart}, ${countryName.trim()}`;
    }
    if (countryName?.trim()) {
      return countryName.trim();
    }
  }

  // Country-only geo (URN query sometimes returns just ISO with no localized name)
  const iso = (geoEntity.countryISOCode as string | undefined)?.trim();
  if (iso && !cityPart) {
    return undefined;
  }

  return undefined;
}

function extractProfileLocationFromEntities(
  entities: VoyagerEntity[],
  username: string,
  profileUrn: string | null,
): string | undefined {
  const entityByUrn = buildEntityByUrn(entities);

  for (const e of entities) {
    const type = e.$type as string | undefined;
    if (!type?.includes("identity.profile.Profile")) {
      continue;
    }
    if (PRIVACY_PROFILE_OR_MINI_RE.test(type)) {
      continue;
    }

    const pubId = nfcText(e.publicIdentifier) ?? nfcText(e.vanityName);
    const entityUrn = typeof e.entityUrn === "string" ? e.entityUrn : undefined;
    const matchesUser = pubId === nfcText(username) || (!!profileUrn && entityUrn === profileUrn);
    if (!matchesUser) {
      continue;
    }

    const loc = resolveGeoFromProfileEntity(e, entityByUrn);
    if (loc) {
      return loc;
    }
  }

  return undefined;
}

function resolveGeoFromProfileEntity(
  profile: VoyagerEntity,
  entityByUrn: Map<string, VoyagerEntity>,
): string | undefined {
  const geoByUrn = buildGeoEntityMap([...entityByUrn.values()]);
  const { geoLocation } = profile;
  if (!geoLocation) {
    return undefined;
  }

  const localized = (geoLocation.defaultLocalizedName ??
    geoLocation.defaultLocalizedNameWithoutCountryName) as string | undefined;
  if (localized?.trim()) {
    return localized.trim();
  }

  const geoUrn = (geoLocation["*geo"] ?? geoLocation.geoUrn) as string | undefined;
  if (!geoUrn) {
    return undefined;
  }

  const geoEntity = geoByUrn.get(geoUrn) ?? entityByUrn.get(geoUrn);
  if (!geoEntity) {
    return undefined;
  }

  return resolveGeoDisplayName(geoEntity, geoByUrn);
}

function extractLocationFromApiResponse(
  response: VoyagerEntity | null,
  profileUrn: string | null,
): string | undefined {
  if (!response) {
    return undefined;
  }

  const entities = collectIncludedEntities([response]);
  const entityByUrn = buildEntityByUrn(entities);

  for (const e of entities) {
    const type = e.$type as string | undefined;
    if (!type?.includes("identity.profile.Profile")) {
      continue;
    }
    if (PRIVACY_PROFILE_OR_MINI_RE.test(type)) {
      continue;
    }
    if (profileUrn && e.entityUrn !== profileUrn) {
      continue;
    }

    const loc = resolveGeoFromProfileEntity(e, entityByUrn);
    if (loc) {
      return loc;
    }
  }

  // Last resort within this response: first profile entity that has geo
  for (const e of entities) {
    const type = e.$type as string | undefined;
    if (!type?.includes("identity.profile.Profile")) {
      continue;
    }
    if (PRIVACY_PROFILE_OR_MINI_RE.test(type)) {
      continue;
    }

    const loc = resolveGeoFromProfileEntity(e, entityByUrn);
    if (loc) {
      return loc;
    }
  }

  return undefined;
}

const PROFILE_GRAPHQL_BY_URN = "voyagerIdentityDashProfiles.7bab95a76318a84301169b923d563eb1";
const PROFILE_GRAPHQL_BY_VANITY = "voyagerIdentityDashProfiles.34ead06db82a2cc9a778fac97f69ad6a";
const FULL_PROFILE_DECORATION =
  "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93";

function profileGraphqlPathByUrn(profileUrn: string): string {
  const variables = `(profileUrn:${encodeURIComponent(profileUrn)})`;
  return `/voyager/api/graphql?includeWebMetadata=true&variables=${variables}&queryId=${PROFILE_GRAPHQL_BY_URN}`;
}

function profileGraphqlPathByVanity(username: string): string {
  const variables = `(vanityName:${encodeURIComponent(username)})`;
  return `/voyager/api/graphql?includeWebMetadata=true&variables=${variables}&queryId=${PROFILE_GRAPHQL_BY_VANITY}`;
}

function dashProfilePath(
  memberIdentity: string,
  decorationId: string | null = FULL_PROFILE_DECORATION,
): string {
  const decoration = decorationId ? `&decorationId=${decorationId}` : "";
  return (
    "/voyager/api/identity/dash/profiles?q=memberIdentity" +
    `&memberIdentity=${encodeURIComponent(memberIdentity)}` +
    decoration
  );
}

function collectProfileEntities(response: VoyagerEntity | null): VoyagerEntity[] {
  if (!response) {
    return [];
  }
  return collectVoyagerObjects(response);
}

function bioFromResponse(
  response: VoyagerEntity | null,
  username: string,
  profileUrn: string | null,
): string | undefined {
  return extractVoyagerBio(collectProfileEntities(response), username, profileUrn);
}

interface VoyagerProfileMeta {
  bio: string | undefined;
  identity: SduiIdentity | null;
  location: string | undefined;
}

function identityFromResponse(
  response: VoyagerEntity | null,
  username: string,
  profileUrn: string | null,
): SduiIdentity | null {
  if (!response) {
    return null;
  }
  return extractVoyagerIdentity(collectProfileEntities(response), username, profileUrn);
}

/**
 * Resolves profile location and identity from Voyager.
 *
 * Location priority: GraphQL by vanity → GraphQL by URN → embedded entities.
 * Identity uses the same responses (and MiniProfile / Profile entities).
 */
async function fetchVoyagerProfileMeta(username: string): Promise<VoyagerProfileMeta> {
  try {
    return await loadVoyagerProfileMeta(username);
  } catch (error) {
    extLog.warn("[linkedin][fetchDetails] profile meta failed", error);
    return { bio: undefined, identity: null, location: undefined };
  }
}

async function loadVoyagerProfileMeta(username: string): Promise<VoyagerProfileMeta> {
  const normalizedHandle = (() => {
    try {
      return decodeURIComponent(username);
    } catch {
      return username;
    }
  })();

  const blocks = extractLivePageJsonBlocks();
  const entities = collectVoyagerObjects(blocks);
  const profileUrn = extractProfileUrn(
    entities.length > 0 ? entities : collectIncludedEntities(blocks),
    normalizedHandle,
  );

  let identity = extractVoyagerIdentity(entities, normalizedHandle, profileUrn);
  let bio = extractVoyagerBio(entities, normalizedHandle, profileUrn);
  let location: string | undefined;

  const [byVanity, dashByVanity] = await Promise.all([
    voyagerFetch(profileGraphqlPathByVanity(normalizedHandle)),
    voyagerFetch(dashProfilePath(normalizedHandle)),
  ]);
  identity ??= identityFromResponse(byVanity, normalizedHandle, profileUrn);
  identity ??= identityFromResponse(dashByVanity, normalizedHandle, profileUrn);
  bio ??= bioFromResponse(byVanity, normalizedHandle, profileUrn);
  bio ??= bioFromResponse(dashByVanity, normalizedHandle, profileUrn);
  location = extractLocationFromApiResponse(byVanity, profileUrn);
  location ??= extractLocationFromApiResponse(dashByVanity, profileUrn);

  if (!bio) {
    const dashBare = await voyagerFetch(dashProfilePath(normalizedHandle, null));
    identity ??= identityFromResponse(dashBare, normalizedHandle, profileUrn);
    bio ??= bioFromResponse(dashBare, normalizedHandle, profileUrn);
    location ??= extractLocationFromApiResponse(dashBare, profileUrn);
  }

  if (location) {
    extLog.debug(`[linkedin][fetchDetails] profile location: graphql/vanity → ${location}`);
  }
  if (bio) {
    extLog.debug(`[linkedin][fetchDetails] profile bio: dash/graphql → ${bio.length}c`);
  }

  if ((!location || !identity || !bio) && profileUrn) {
    const [byUrn, dashByUrn] = await Promise.all([
      voyagerFetch(profileGraphqlPathByUrn(profileUrn)),
      bio ? Promise.resolve(null) : voyagerFetch(dashProfilePath(profileUrn)),
    ]);
    identity ??= identityFromResponse(byUrn, normalizedHandle, profileUrn);
    identity ??= identityFromResponse(dashByUrn, normalizedHandle, profileUrn);
    bio ??= bioFromResponse(byUrn, normalizedHandle, profileUrn);
    bio ??= bioFromResponse(dashByUrn, normalizedHandle, profileUrn);
    if (!location) {
      location = extractLocationFromApiResponse(byUrn, profileUrn);
      location ??= extractLocationFromApiResponse(dashByUrn, profileUrn);
      if (location) {
        extLog.debug(`[linkedin][fetchDetails] profile location: graphql/urn → ${location}`);
      }
    }
  }

  if (!location) {
    location = extractProfileLocationFromEntities(entities, normalizedHandle, profileUrn);
    if (location) {
      extLog.debug(`[linkedin][fetchDetails] profile location: embedded → ${location}`);
    }
  }

  if (!location) {
    extLog.debug(`[linkedin][fetchDetails] profile location: none for ${normalizedHandle}`);
  }
  if (!identity) {
    extLog.debug(`[linkedin][fetchDetails] profile identity: none for ${normalizedHandle}`);
  }
  if (!bio) {
    extLog.debug(`[linkedin][fetchDetails] profile bio: none for ${normalizedHandle}`);
  }

  return { bio, identity, location };
}

/** Resolves profile location from Voyager — never from topcard DOM text. */
async function fetchProfileLocation(username: string): Promise<string | undefined> {
  const { location } = await fetchVoyagerProfileMeta(username);
  return location;
}

export type { VoyagerProfileMeta };
export { fetchProfileLocation, fetchVoyagerProfileMeta };
