import { createSocialUrl, extractUsername, SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import type { ImportantDateType, SocialPlatform } from "@bondery/schemas";
import { stableStringify } from "#carddav-etag.js";
import type { VCardProperty } from "#model.js";

/**
 * Year that marks an important date with an unknown year. The vCard import stores year-less
 * dates the same way.
 */
const YEARLESS_SENTINEL_YEAR: number = 1904;

const SORT_BEFORE = -1;
const SORT_AFTER = 1;

const HEADLINE_ORG_RE = /^(?:(.*?)\s+)?@\s*(\S.*)$/s;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const NON_PHONE_CHARACTER_RE = /[^\d+]/g;
const LEADING_PLUS_RE = /^\+/;
const LINE_BREAK_RE = /[\r\n]+/g;
const HTTP_SCHEME_RE = /^https?:\/\//i;
const WWW_PREFIX_RE = /^www\./i;
const TRAILING_SLASH_RE = /\/+$/;

/** Phone type values of `people_phones.type`. The column defaults to "mobile". */
type CardPhoneInputType = "mobile" | "home" | "work";

/** Email type values. The schema allows home and work, the column defaults to "personal". */
type CardEmailInputType = "personal" | "home" | "work";

type CardAddressType = "home" | "work" | "other";

/** Platforms a device shows as profile links. */
type CardProfilePlatform = Extract<SocialPlatform, "linkedin" | "instagram" | "facebook">;

/** Platforms a device shows as instant messaging accounts. */
type CardMessengerPlatform = Extract<SocialPlatform, "whatsapp" | "signal">;

/** Narrow input of a card. The caller maps database rows into it. */
interface CardDavPersonInput {
  addresses: Array<{
    city: string | null;
    country: string | null;
    label: string | null;
    line1: string | null;
    line2: string | null;
    postalCode: string | null;
    state: string | null;
    type: CardAddressType;
  }>;
  emails: Array<{
    preferred: boolean;
    sortOrder: number;
    type: CardEmailInputType;
    value: string;
  }>;
  firstName: string;
  headline: string | null;
  id: string;
  /** Dates as `YYYY-MM-DD`. Year 1904 means the year is unknown. */
  importantDates: Array<{ date: string; note: string | null; type: ImportantDateType }>;
  lastName: string | null;
  middleName: string | null;
  phones: Array<{
    preferred: boolean;
    /** Calling code such as `+420`. May be empty when `value` is already international. */
    prefix: string;
    sortOrder: number;
    type: CardPhoneInputType;
    value: string;
  }>;
  /** `people.avatar_updated_at` as an ISO string. */
  photoVersion: string | null;
  socials: Array<{ handle: string; platform: SocialPlatform }>;
}

interface CardPhone {
  preferred: boolean;
  type: CardPhoneInputType;
  /** Phone number with the calling code, digits and a leading plus only. */
  value: string;
}

interface CardEmail {
  preferred: boolean;
  type: "home" | "work";
  value: string;
}

interface CardAddress {
  city: string;
  country: string;
  label: string;
  line1: string;
  line2: string;
  postalCode: string;
  state: string;
  type: CardAddressType;
}

interface CardSocialProfile {
  handle: string;
  platform: CardProfilePlatform;
}

interface CardMessenger {
  handle: string;
  platform: CardMessengerPlatform;
}

interface CardDate {
  /** `YYYY-MM-DD`, or `--MM-DD` when the year is unknown. */
  date: string;
  note: string;
  type: ImportantDateType;
}

/** Canonical, version-neutral JSON of the fields a card carries. */
interface CardProjection {
  addresses: CardAddress[];
  /** `YYYY-MM-DD`, or `--MM-DD` when the year is unknown. */
  birthday: string | null;
  emails: CardEmail[];
  headline: { org: string | null; title: string | null };
  messengers: CardMessenger[];
  name: { first: string; last: string; middle: string };
  otherDates: CardDate[];
  phones: CardPhone[];
  photoVersion: string | null;
  socialProfiles: CardSocialProfile[];
  websites: string[];
}

/**
 * What a card keeps beyond the projection. A device owns it. The server stores it and writes it
 * back as it is.
 */
interface CardExtras {
  /** Raw (still escaped) fourth `N` component. */
  namePrefix: string;
  /** Raw (still escaped) fifth `N` component. */
  nameSuffix: string;
  /** Unmapped properties in device order, with group and parameters. Values stay raw. */
  properties: VCardProperty[];
}

/** Field groups a three-way merge compares and replaces as one unit. */
const CARD_FIELD_GROUPS = [
  "name",
  "headline",
  "phones",
  "emails",
  "addresses",
  "websitesAndSocials",
  "dates",
  "photo",
] as const;

type CardFieldGroup = (typeof CARD_FIELD_GROUPS)[number];

/** Extras of a card with nothing beyond the projection. */
function emptyCardExtras(): CardExtras {
  return { namePrefix: "", nameSuffix: "", properties: [] };
}

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(LINE_BREAK_RE, " ").trim();
}

function compareText(left: string, right: string) {
  if (left === right) {
    return 0;
  }
  return left < right ? SORT_BEFORE : SORT_AFTER;
}

/**
 * Splits a headline into title and organization. "Title @ Org" and "Title @Org" give the same
 * result. Any other headline is a title.
 */
function splitHeadline(headline: string | null): {
  org: string | null;
  title: string | null;
} {
  const text = clean(headline);
  if (!text) {
    return { org: null, title: null };
  }
  const match = HEADLINE_ORG_RE.exec(text);
  if (!match) {
    return { org: null, title: text };
  }
  const title = clean(match[1]);
  return { org: clean(match[2]) || null, title: title || null };
}

/** Joins title and organization into the headline form "Title @Org". */
function joinHeadline(title: string | null, org: string | null): string | null {
  const titleText = clean(title);
  const orgText = clean(org);
  const joined = orgText ? `${titleText} @${orgText}`.trim() : titleText;
  return joined || null;
}

function projectPhoneValue(prefix: string, value: string): string {
  const trimmedPrefix = prefix.trim();
  const calling =
    trimmedPrefix && !trimmedPrefix.startsWith("+") ? `+${trimmedPrefix}` : trimmedPrefix;
  const combined = `${calling}${value.trim()}`.replace(NON_PHONE_CHARACTER_RE, "");
  const digits = combined.replace(LEADING_PLUS_RE, "").replace(/\+/g, "");
  if (!digits) {
    return "";
  }
  return combined.startsWith("+") ? `+${digits}` : digits;
}

/** True when `url` is `<profile base><handle>` apart from scheme, `www.` and trailing slash. */
function isCanonicalProfileUrl(url: string, platform: CardProfilePlatform): boolean {
  const normalize = (value: string): string =>
    value.replace(HTTP_SCHEME_RE, "").replace(WWW_PREFIX_RE, "").replace(TRAILING_SLASH_RE, "");
  const handle = extractProfileHandle(platform, url);
  const base = SOCIAL_PLATFORM_URL_DETAILS[platform].profileBaseUrl;
  return normalize(url) === normalize(`${base}${handle}`);
}

/**
 * Reads the handle out of a profile URL of the platform's own host. Anything else stays as it
 * is. Plain `extractUsername` finds the host anywhere in the text, so it cannot decide this.
 */
function extractProfileHandle(platform: CardProfilePlatform, value: string): string {
  const text = clean(value);
  const { domain } = SOCIAL_PLATFORM_URL_DETAILS[platform];
  const host = text.replace(HTTP_SCHEME_RE, "").replace(WWW_PREFIX_RE, "");
  if (HTTP_SCHEME_RE.test(text) && host.toLowerCase().startsWith(`${domain}/`)) {
    return extractUsername(platform, text);
  }
  return text;
}

/** The profile platform whose host a URL belongs to, or null for any other URL. */
function profilePlatformOfUrl(url: string): CardProfilePlatform | null {
  if (!HTTP_SCHEME_RE.test(url)) {
    return null;
  }
  const host = url.replace(HTTP_SCHEME_RE, "").replace(WWW_PREFIX_RE, "").toLowerCase();
  const platforms: CardProfilePlatform[] = ["linkedin", "instagram", "facebook"];
  return (
    platforms.find(
      (platform) =>
        host.startsWith(`${SOCIAL_PLATFORM_URL_DETAILS[platform].domain}/`) &&
        isCanonicalProfileUrl(url, platform),
    ) ?? null
  );
}

function projectDate(value: string): string | null {
  const match = ISO_DATE_RE.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const maxDay = 31;
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > maxDay) {
    return null;
  }
  return Number(year) === YEARLESS_SENTINEL_YEAR ? `--${month}-${day}` : `${year}-${month}-${day}`;
}

function projectPhones(input: CardDavPersonInput): CardPhone[] {
  return input.phones
    .map((phone) => ({
      preferred: phone.preferred,
      sortOrder: phone.sortOrder,
      type: phone.type,
      value: projectPhoneValue(phone.prefix, phone.value),
    }))
    .filter((phone) => phone.value)
    .sort((a, b) => a.sortOrder - b.sortOrder || compareText(a.value, b.value))
    .map(({ preferred, type, value }) => ({ preferred, type, value }));
}

function projectEmails(input: CardDavPersonInput): CardEmail[] {
  return input.emails
    .map((email) => ({
      preferred: email.preferred,
      sortOrder: email.sortOrder,
      type: email.type === "work" ? ("work" as const) : ("home" as const),
      value: clean(email.value),
    }))
    .filter((email) => email.value)
    .sort((a, b) => a.sortOrder - b.sortOrder || compareText(a.value, b.value))
    .map(({ preferred, type, value }) => ({ preferred, type, value }));
}

function projectAddresses(input: CardDavPersonInput): CardAddress[] {
  return input.addresses
    .map((address) => ({
      city: clean(address.city),
      country: clean(address.country),
      label: clean(address.label),
      line1: clean(address.line1),
      line2: clean(address.line2),
      postalCode: clean(address.postalCode),
      state: clean(address.state),
      type: address.type,
    }))
    .filter(
      (address) =>
        address.line1 ||
        address.line2 ||
        address.city ||
        address.state ||
        address.postalCode ||
        address.country,
    );
}

function projectSocials(input: CardDavPersonInput): {
  messengers: CardMessenger[];
  socialProfiles: CardSocialProfile[];
  websites: string[];
} {
  const websites: string[] = [];
  const socialProfiles: CardSocialProfile[] = [];
  const messengers: CardMessenger[] = [];

  for (const social of input.socials) {
    const handle = clean(social.handle);
    if (!handle) {
      continue;
    }
    if (social.platform === "whatsapp" || social.platform === "signal") {
      messengers.push({ handle, platform: social.platform });
    } else if (social.platform === "website") {
      const url = createSocialUrl("website", handle);
      const platform = profilePlatformOfUrl(url);
      if (platform) {
        socialProfiles.push({ handle: extractProfileHandle(platform, url), platform });
      } else if (url) {
        websites.push(url);
      }
    } else {
      socialProfiles.push({
        handle: extractProfileHandle(social.platform, handle),
        platform: social.platform,
      });
    }
  }

  const byPlatformAndHandle = (
    a: { handle: string; platform: string },
    b: { handle: string; platform: string },
  ) => compareText(a.platform, b.platform) || compareText(a.handle, b.handle);
  return {
    messengers: messengers.sort(byPlatformAndHandle),
    socialProfiles: socialProfiles.sort(byPlatformAndHandle),
    websites,
  };
}

function projectDates(input: CardDavPersonInput): {
  birthday: string | null;
  otherDates: CardDate[];
} {
  const dates: CardDate[] = [];
  for (const entry of input.importantDates) {
    const date = projectDate(entry.date);
    if (date) {
      dates.push({ date, note: clean(entry.note), type: entry.type });
    }
  }
  const byDateTypeNote = (a: CardDate, b: CardDate) =>
    compareText(a.date, b.date) || compareText(a.type, b.type) || compareText(a.note, b.note);
  dates.sort(byDateTypeNote);

  const birthdayIndex = dates.findIndex((entry) => entry.type === "birthday");
  const birthday = birthdayIndex === -1 ? null : (dates[birthdayIndex]?.date ?? null);
  const otherDates = dates.filter((_, index) => index !== birthdayIndex);
  return { birthday, otherDates };
}

/**
 * Maps a person to the canonical fields of a card. Notes, tags, groups, location, timezone,
 * language, keep-in-touch and LinkedIn history are not part of a card.
 *
 * Every list has one stable order, so equal people give equal projections.
 *
 * @param input Narrow person data.
 * @returns Canonical projection.
 */
function projectCard(input: CardDavPersonInput): CardProjection {
  return {
    addresses: projectAddresses(input),
    ...projectDates(input),
    emails: projectEmails(input),
    headline: splitHeadline(input.headline),
    name: {
      first: clean(input.firstName),
      last: clean(input.lastName),
      middle: clean(input.middleName),
    },
    phones: projectPhones(input),
    photoVersion: input.photoVersion,
    ...projectSocials(input),
  };
}

/** Value of one field group, for comparison in a three-way merge. */
function readFieldGroup(projection: CardProjection, group: CardFieldGroup): unknown {
  switch (group) {
    case "name":
      return projection.name;
    case "headline":
      return projection.headline;
    case "phones":
      return projection.phones;
    case "emails":
      return projection.emails;
    case "addresses":
      return projection.addresses;
    case "websitesAndSocials":
      return {
        messengers: projection.messengers,
        socialProfiles: projection.socialProfiles,
        websites: projection.websites,
      };
    case "dates":
      return { birthday: projection.birthday, otherDates: projection.otherDates };
    case "photo":
      return projection.photoVersion;
  }
}

/** Field groups whose value differs between two projections. */
function changedFieldGroups(left: CardProjection, right: CardProjection): CardFieldGroup[] {
  return CARD_FIELD_GROUPS.filter(
    (group) =>
      stableStringify(readFieldGroup(left, group)) !==
      stableStringify(readFieldGroup(right, group)),
  );
}

export type {
  CardAddress,
  CardAddressType,
  CardDate,
  CardDavPersonInput,
  CardEmail,
  CardEmailInputType,
  CardExtras,
  CardFieldGroup,
  CardMessenger,
  CardMessengerPlatform,
  CardPhone,
  CardPhoneInputType,
  CardProfilePlatform,
  CardProjection,
  CardSocialProfile,
};

export {
  CARD_FIELD_GROUPS,
  changedFieldGroups,
  emptyCardExtras,
  extractProfileHandle,
  joinHeadline,
  projectCard,
  readFieldGroup,
  splitHeadline,
  YEARLESS_SENTINEL_YEAR,
};
