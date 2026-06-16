export interface VCardParameter {
  name: string;
  values: string[];
}

export interface VCardProperty {
  group?: string;
  name: string;
  parameters: VCardParameter[];
  value: string;
}

export interface VCardRaw {
  version: string | null;
  properties: VCardProperty[];
  warnings: string[];
}

export interface VCardTextValue {
  value: string;
  language?: string;
  pref?: number;
  types: string[];
  altId?: string;
  pid?: string[];
}

export interface VCardName {
  familyNames: string[];
  givenNames: string[];
  additionalNames: string[];
  honorificPrefixes: string[];
  honorificSuffixes: string[];
}

export interface VCardMedia {
  uri: string;
  mediaType?: string;
  pref?: number;
  types: string[];
  altId?: string;
  pid?: string[];
  source: "uri" | "data-uri" | "legacy-inline";
}

export interface VCardPhone {
  value: string;
  uri: string;
  pref?: number;
  types: string[];
  altId?: string;
  pid?: string[];
}

export interface VCardAddress {
  poBox: string[];
  extended: string[];
  street: string[];
  locality: string[];
  region: string[];
  postalCode: string[];
  country: string[];
  label?: string;
  geo?: string;
  tz?: string;
  pref?: number;
  types: string[];
  altId?: string;
  pid?: string[];
}

export interface VCardOrganization {
  values: string[];
  pref?: number;
  types: string[];
  language?: string;
  altId?: string;
  pid?: string[];
}

export interface VCardRelated {
  value: string;
  valueType: "uri" | "text";
  pref?: number;
  types: string[];
  altId?: string;
  pid?: string[];
}

export interface VCardDateValue {
  value: string;
  valueType: "date-and-or-time" | "text";
  calscale?: string;
}

export interface VCardTimezone {
  value: string;
  valueType: "text" | "uri" | "utc-offset";
}

export interface VCard {
  kind: string;
  fullName: string;
  name?: VCardName;
  nicknames: string[];
  phones: VCardPhone[];
  emails: VCardTextValue[];
  addresses: VCardAddress[];
  instantMessaging: VCardTextValue[];
  urls: VCardTextValue[];
  languages: VCardTextValue[];
  titles: VCardTextValue[];
  roles: VCardTextValue[];
  organizations: VCardOrganization[];
  notes: VCardTextValue[];
  categories: string[];
  photos: VCardMedia[];
  logos: VCardMedia[];
  sounds: VCardMedia[];
  keys: VCardMedia[];
  related: VCardRelated[];
  birthday?: VCardDateValue;
  anniversary?: VCardDateValue;
  timezone?: VCardTimezone;
  geo?: string;
  uid?: string;
  revision?: string;
  productId?: string;
  raw: VCardRaw;
  customProperties: VCardProperty[];
}

export interface ParsedVCard {
  raw: VCardRaw;
  card: VCard;
}

export interface VCardParseOptions {
  strictVersion?: boolean;
}

export interface VCardSerializeOptions {
  includeProductId?: boolean;
  productId?: string;
}

export interface VCardMediaAttachmentInput {
  uri?: string;
  data?: Uint8Array | ArrayBuffer | string;
  mediaType?: string;
  pref?: number;
  types?: string[];
}

export type VCardMediaPropertyName = "PHOTO" | "LOGO" | "SOUND" | "KEY";

export interface VCardContactDraft {
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  headline: string | null;
  notes: string | null;
  website: string | null;
  language: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  emails: Array<{ value: string; type: "home" | "work"; preferred: boolean }>;
  phones: Array<{ prefix: string; value: string; type: "home" | "work"; preferred: boolean }>;
  addresses: Array<{
    value: string;
    type: "home" | "work" | "other";
    preferred: boolean;
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressPostalCode: string | null;
    addressState: string | null;
    addressCountry: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  signal: string | null;
  avatarUri: string | null;
  importantDates: Array<{
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
    note: string | null;
  }> | null;
  raw: VCardRaw;
}
