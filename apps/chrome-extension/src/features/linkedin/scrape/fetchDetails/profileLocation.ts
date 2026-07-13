/**
 * Profile location resolution via Voyager GraphQL and embedded entities.
 */

import { extLog } from "../../../../lib/log";
import {
  buildEntityByUrn,
  collectIncludedEntities,
  extractLivePageJsonBlocks,
  extractProfileUrn,
  voyagerFetch,
} from "./voyagerShared";

function buildGeoEntityMap(
  entities: Record<string, unknown>[],
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
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
  geoEntity: Record<string, unknown>,
  geoByUrn: Map<string, Record<string, unknown>>,
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
  entities: Record<string, unknown>[],
  username: string,
  profileUrn: string | null,
): string | undefined {
  const entityByUrn = buildEntityByUrn(entities);

  for (const e of entities) {
    const type = e.$type as string | undefined;
    if (!type?.includes("identity.profile.Profile")) {
      continue;
    }
    if (/PrivacySettings|ProfileCard|MiniProfile/i.test(type)) {
      continue;
    }

    const pubId = (e.publicIdentifier ?? e.vanityName) as string | undefined;
    const entityUrn = e.entityUrn as string | undefined;
    const matchesUser =
      pubId?.normalize("NFC") === username.normalize("NFC") ||
      (!!profileUrn && entityUrn === profileUrn);
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
  profile: Record<string, unknown>,
  entityByUrn: Map<string, Record<string, unknown>>,
): string | undefined {
  const geoByUrn = buildGeoEntityMap([...entityByUrn.values()]);
  const geoLocation = profile.geoLocation as Record<string, unknown> | undefined;
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
  response: Record<string, unknown> | null,
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
    if (/PrivacySettings|ProfileCard|MiniProfile/i.test(type)) {
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
    if (/PrivacySettings|ProfileCard|MiniProfile/i.test(type)) {
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

function profileGraphqlPathByUrn(profileUrn: string): string {
  const variables = `(profileUrn:${encodeURIComponent(profileUrn)})`;
  return `/voyager/api/graphql?includeWebMetadata=true&variables=${variables}&queryId=${PROFILE_GRAPHQL_BY_URN}`;
}

function profileGraphqlPathByVanity(username: string): string {
  const variables = `(vanityName:${encodeURIComponent(username)})`;
  return `/voyager/api/graphql?includeWebMetadata=true&variables=${variables}&queryId=${PROFILE_GRAPHQL_BY_VANITY}`;
}

/**
 * Resolves profile location from Voyager — never from topcard DOM text.
 *
 * Priority: GraphQL by vanity (richest geo names) → GraphQL by URN → embedded entities.
 * The URN query often returns Geo with only countryISO; vanity includes defaultLocalizedName.
 */
export async function fetchProfileLocation(username: string): Promise<string | undefined> {
  const normalizedHandle = (() => {
    try {
      return decodeURIComponent(username);
    } catch {
      return username;
    }
  })();

  const blocks = extractLivePageJsonBlocks();
  const entities = collectIncludedEntities(blocks);
  const profileUrn = extractProfileUrn(entities, normalizedHandle);

  const byVanity = await voyagerFetch(profileGraphqlPathByVanity(normalizedHandle));
  const fromVanity = extractLocationFromApiResponse(byVanity, profileUrn);
  if (fromVanity) {
    extLog.debug(`[linkedin][fetchDetails] profile location: graphql/vanity → ${fromVanity}`);
    return fromVanity;
  }

  if (profileUrn) {
    const byUrn = await voyagerFetch(profileGraphqlPathByUrn(profileUrn));
    const fromUrn = extractLocationFromApiResponse(byUrn, profileUrn);
    if (fromUrn) {
      extLog.debug(`[linkedin][fetchDetails] profile location: graphql/urn → ${fromUrn}`);
      return fromUrn;
    }
  }

  const embedded = extractProfileLocationFromEntities(entities, normalizedHandle, profileUrn);
  if (embedded) {
    extLog.debug(`[linkedin][fetchDetails] profile location: embedded → ${embedded}`);
    return embedded;
  }

  extLog.debug(`[linkedin][fetchDetails] profile location: none for ${normalizedHandle}`);
  return undefined;
}
