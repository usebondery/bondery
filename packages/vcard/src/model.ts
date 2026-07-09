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
  properties: VCardProperty[];
  version: string | null;
  warnings: string[];
}

export interface VCardTextValue {
  altId?: string;
  language?: string;
  pid?: string[];
  pref?: number;
  types: string[];
  value: string;
}

export interface VCardName {
  additionalNames: string[];
  familyNames: string[];
  givenNames: string[];
  honorificPrefixes: string[];
  honorificSuffixes: string[];
}

export interface VCardMedia {
  altId?: string;
  mediaType?: string;
  pid?: string[];
  pref?: number;
  source: "uri" | "data-uri" | "legacy-inline";
  types: string[];
  uri: string;
}

export interface VCardPhone {
  altId?: string;
  pid?: string[];
  pref?: number;
  types: string[];
  uri: string;
  value: string;
}

export interface VCardAddress {
  altId?: string;
  country: string[];
  extended: string[];
  geo?: string;
  label?: string;
  locality: string[];
  pid?: string[];
  poBox: string[];
  postalCode: string[];
  pref?: number;
  region: string[];
  street: string[];
  types: string[];
  tz?: string;
}

export interface VCardOrganization {
  altId?: string;
  language?: string;
  pid?: string[];
  pref?: number;
  types: string[];
  values: string[];
}

export interface VCardRelated {
  altId?: string;
  pid?: string[];
  pref?: number;
  types: string[];
  value: string;
  valueType: "uri" | "text";
}

export interface VCardDateValue {
  calscale?: string;
  value: string;
  valueType: "date-and-or-time" | "text";
}

export interface VCardTimezone {
  value: string;
  valueType: "text" | "uri" | "utc-offset";
}

export interface VCard {
  addresses: VCardAddress[];
  anniversary?: VCardDateValue;
  birthday?: VCardDateValue;
  categories: string[];
  customProperties: VCardProperty[];
  emails: VCardTextValue[];
  fullName: string;
  geo?: string;
  instantMessaging: VCardTextValue[];
  keys: VCardMedia[];
  kind: string;
  languages: VCardTextValue[];
  logos: VCardMedia[];
  name?: VCardName;
  nicknames: string[];
  notes: VCardTextValue[];
  organizations: VCardOrganization[];
  phones: VCardPhone[];
  photos: VCardMedia[];
  productId?: string;
  raw: VCardRaw;
  related: VCardRelated[];
  revision?: string;
  roles: VCardTextValue[];
  sounds: VCardMedia[];
  timezone?: VCardTimezone;
  titles: VCardTextValue[];
  uid?: string;
  urls: VCardTextValue[];
}

export interface ParsedVCard {
  card: VCard;
  raw: VCardRaw;
}

export interface VCardParseOptions {
  strictVersion?: boolean;
}

export interface VCardSerializeOptions {
  includeProductId?: boolean;
  productId?: string;
}

export interface VCardMediaAttachmentInput {
  data?: Uint8Array | ArrayBuffer | string;
  mediaType?: string;
  pref?: number;
  types?: string[];
  uri?: string;
}

export type VCardMediaPropertyName = "PHOTO" | "LOGO" | "SOUND" | "KEY";

export interface VCardContactDraft {
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
  avatarUri: string | null;
  emails: Array<{ value: string; type: "home" | "work"; preferred: boolean }>;
  facebook: string | null;
  firstName: string;
  headline: string | null;
  importantDates: Array<{
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
    note: string | null;
  }> | null;
  instagram: string | null;
  language: string | null;
  lastName: string | null;
  latitude: number | null;
  linkedin: string | null;
  longitude: number | null;
  middleName: string | null;
  notes: string | null;
  phones: Array<{ prefix: string; value: string; type: "home" | "work"; preferred: boolean }>;
  raw: VCardRaw;
  signal: string | null;
  timezone: string | null;
  website: string | null;
  whatsapp: string | null;
}
