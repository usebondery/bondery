/** Which view mode is active on the map page. */
export type MapView = "locations" | "addresses";

/** One pin per geocoded person (direct gis_point or preferred address). */
export interface MapPin {
  id: string;
  firstName: string;
  lastName: string | null;
  headline: string | null;
  location: string | null;
  lastInteraction: string | null;
  latitude: number;
  longitude: number;
  avatar: string | null;
}

/** One pin per people_addresses row. Same person can appear multiple times. */
export interface AddressPin {
  addressId: string;
  personId: string;
  firstName: string;
  lastName: string | null;
  addressType: "home" | "work" | "other";
  addressFormatted: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  latitude: number;
  longitude: number;
  avatar: string | null;
}
