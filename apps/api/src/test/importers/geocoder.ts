/**
 * A geocoder stand-in for the vCard importer tests.
 *
 * `parseVCardUpload` resolves every address through Mapy.com. This module replaces that client
 * with a deterministic one, so a test asserts on the importer and not on a network call.
 *
 * Both behaviours that change the import result are modelled:
 * - a street the geocoder confirms becomes `validity: "valid"` and is written;
 * - a street it cannot confirm becomes `validity: "invalid"` and is dropped at commit.
 *
 * The coordinates are the real city centres, and the place list is derived from the corpus itself,
 * so a fixture can never carry a city this stand-in does not know.
 */
import type { Geocoder } from "../../lib/integrations/mapy.js";
import { loadBaseValues } from "./fixtures.js";

/** One resolvable place: what the geocoder returns for a matching query. */
type KnownPlace = {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  name: string;
  postalCode: string;
  region: string;
  timezone: string;
};

/** A spread of real coordinates, assigned to cities in base-table order. */
const COORDINATES: ReadonlyArray<{ lat: number; lon: number; timezone: string }> = [
  { lat: 51.5074, lon: -0.1278, timezone: "Europe/London" },
  { lat: 37.7749, lon: -122.4194, timezone: "America/Los_Angeles" },
  { lat: 30.2672, lon: -97.7431, timezone: "America/Chicago" },
  { lat: 40.7128, lon: -74.006, timezone: "America/New_York" },
  { lat: 48.2082, lon: 16.3738, timezone: "Europe/Vienna" },
  { lat: 52.52, lon: 13.405, timezone: "Europe/Berlin" },
  { lat: 35.6762, lon: 139.6503, timezone: "Asia/Tokyo" },
  { lat: 37.5665, lon: 126.978, timezone: "Asia/Seoul" },
  { lat: 19.4326, lon: -99.1332, timezone: "America/Mexico_City" },
  { lat: 12.9716, lon: 77.5946, timezone: "Asia/Kolkata" },
];

/**
 * Decodes a vCard 2.1 quoted-printable value.
 *
 * Samsung writes `Palo=20Alto` and `San=20Francisco`, so the city a geocoder receives is escaped
 * unless this runs first. The parser decodes the value before it reaches here, and the test
 * decodes again so a query assembled from raw fixture text also matches.
 */
function decodeQuotedPrintable(text: string): string {
  return text.replace(/[=](?<group1>[0-9A-Fa-f]{2})/gu, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

/** Every city the corpus mentions, with a stable coordinate and timezone. */
async function knownPlaces(): Promise<KnownPlace[]> {
  const base = await loadBaseValues();
  const byCity = new Map<string, KnownPlace>();

  base.contacts.forEach((contact, index) => {
    if (byCity.has(contact.city)) {
      return;
    }
    const coordinate = COORDINATES[index % COORDINATES.length];
    if (coordinate === undefined) {
      return;
    }
    byCity.set(contact.city, {
      city: contact.city,
      country: contact.country,
      countryCode: contact.countryCode,
      lat: coordinate.lat,
      lon: coordinate.lon,
      name: contact.city,
      postalCode: contact.postalCode,
      region: contact.region ?? contact.country,
      timezone: coordinate.timezone,
    });
  });

  return [...byCity.values()];
}

function normalize(value: string): string {
  return decodeQuotedPrintable(value).trim().toLowerCase();
}

function findPlace(places: readonly KnownPlace[], needle: string): KnownPlace | undefined {
  const target = normalize(needle);
  if (target === "") {
    return undefined;
  }
  return places.find(
    (place) =>
      normalize(place.city) === target ||
      normalize(place.city).includes(target) ||
      target.includes(normalize(place.city)),
  );
}

/** Builds a geocoder that resolves any city in the corpus and nothing else. */
function createMemoryGeocoder(places: readonly KnownPlace[]): Geocoder {
  const lookup = (query: string): KnownPlace | undefined => {
    // A query is `street, city, region, country` or `city, country`. Any segment may name a city.
    for (const part of query.split(",")) {
      const match = findPlace(places, part);
      if (match !== undefined) {
        return match;
      }
    }
    return undefined;
  };

  const resultFor = (place: KnownPlace, name: string) => ({
    city: place.city,
    country: place.country,
    countryCode: place.countryCode,
    formattedLabel: `${place.city}, ${place.region}`,
    lat: place.lat,
    locationEwkt: `SRID=4326;POINT(${place.lon} ${place.lat})`,
    lon: place.lon,
    name,
    postalCode: place.postalCode,
    state: place.region,
    stateCode: null,
  });

  // Each method returns a promise because the geocoder interface is asynchronous, even though
  // this stand-in answers from memory.
  return {
    cachedGeocodeLocation: (location) => {
      const place = lookup(location);
      return Promise.resolve(
        place === undefined
          ? null
          : { geo: resultFor(place, place.name), timezone: place.timezone },
      );
    },
    timezoneForCoordinates: (lat, lon) => {
      const place = places.find((item) => item.lat === lat && item.lon === lon);
      return Promise.resolve(place?.timezone ?? null);
    },
    validateStreet: (query, expectedCity) => {
      // The street must sit in the city the vCard claims, as the real client enforces.
      const place = lookup(expectedCity);
      if (place === undefined || !query.toLowerCase().includes(normalize(place.city))) {
        return Promise.resolve(null);
      }
      return Promise.resolve(resultFor(place, query.split(",")[0]?.trim() ?? place.name));
    },
  };
}

/** A geocoder that resolves nothing, which is what a deployment without a maps key has. */
function createOfflineGeocoder(): Geocoder {
  return {
    cachedGeocodeLocation: () => Promise.resolve(null),
    timezoneForCoordinates: () => Promise.resolve(null),
    validateStreet: () => Promise.resolve(null),
  };
}

export type { KnownPlace };
export { createMemoryGeocoder, createOfflineGeocoder, knownPlaces };
