import type { Prisma } from "@bondery/db";
import type {
  ExportAddressRecord,
  ExportEducationHistoryRecord,
  ExportEmailRecord,
  ExportImportantDateRecord,
  ExportLinkedinRecord,
  ExportPersonRecord,
  ExportPhoneRecord,
  ExportSocialRecord,
  ExportWorkHistoryRecord,
} from "@bondery/schemas";

type PeopleExportRow = Prisma.PeopleGetPayload<{ select: typeof peopleExportSelect }>;

function mapPhone(row: PeopleExportRow["phones"][number]): ExportPhoneRecord {
  return {
    createdAt: toIso(row.createdAt),
    id: row.id,
    preferred: row.preferred,
    prefix: row.prefix,
    sortOrder: row.sortOrder,
    type: row.type,
    updatedAt: toIso(row.updatedAt),
    value: row.value,
  };
}

function mapEmail(row: PeopleExportRow["emails"][number]): ExportEmailRecord {
  return {
    createdAt: toIso(row.createdAt),
    id: row.id,
    preferred: row.preferred,
    sortOrder: row.sortOrder,
    type: row.type,
    updatedAt: toIso(row.updatedAt),
    value: row.value,
  };
}

function mapSocial(row: PeopleExportRow["socials"][number]): ExportSocialRecord {
  return {
    connectedAt: toIsoOrNull(row.connectedAt),
    createdAt: toIso(row.createdAt),
    handle: row.handle,
    id: row.id,
    platform: row.platform,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapAddress(row: PeopleExportRow["addresses"][number]): ExportAddressRecord {
  return {
    addressCity: row.addressCity,
    addressCountry: row.addressCountry,
    addressCountryCode: row.addressCountryCode,
    addressFormatted: row.addressFormatted,
    addressGeocodeSource: row.addressGeocodeSource,
    addressGranularity: row.addressGranularity,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    addressPostalCode: row.addressPostalCode,
    addressState: row.addressState,
    addressStateCode: row.addressStateCode,
    createdAt: toIso(row.createdAt),
    geocodeConfidence: row.geocodeConfidence,
    id: row.id,
    label: row.label,
    latitude: row.latitude,
    longitude: row.longitude,
    sortOrder: row.sortOrder,
    timezone: row.timezone,
    type: row.type,
    updatedAt: toIso(row.updatedAt),
    value: row.value,
  };
}

function mapImportantDate(
  row: PeopleExportRow["importantDates"][number],
): ExportImportantDateRecord {
  return {
    createdAt: toIso(row.createdAt),
    date: toIso(row.date),
    id: row.id,
    note: row.note,
    notifyDaysBefore: row.notifyDaysBefore,
    notifyOn: toIsoOrNull(row.notifyOn),
    type: row.type,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapWorkHistory(
  row: NonNullable<PeopleExportRow["linkedin"]>["workHistory"][number],
): ExportWorkHistoryRecord {
  return {
    companyLinkedinId: row.companyLinkedinId,
    companyName: row.companyName,
    createdAt: toIso(row.createdAt),
    description: row.description,
    employmentType: row.employmentType,
    endDate: toIsoOrNull(row.endDate),
    id: row.id,
    location: row.location,
    startDate: toIsoOrNull(row.startDate),
    title: row.title,
    updatedAt: toIso(row.updatedAt),
  };
}

function mapEducationHistory(
  row: NonNullable<PeopleExportRow["linkedin"]>["educationHistory"][number],
): ExportEducationHistoryRecord {
  return {
    createdAt: toIso(row.createdAt),
    degree: row.degree,
    description: row.description,
    endDate: toIsoOrNull(row.endDate),
    id: row.id,
    schoolLinkedinId: row.schoolLinkedinId,
    schoolName: row.schoolName,
    startDate: toIsoOrNull(row.startDate),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapLinkedin(row: PeopleExportRow["linkedin"]): ExportLinkedinRecord | null {
  if (!row) {
    return null;
  }

  return {
    bio: row.bio,
    educationHistory: row.educationHistory.map(mapEducationHistory),
    workHistory: row.workHistory.map(mapWorkHistory),
  };
}

export const peopleExportSelect = {
  addresses: {
    select: {
      addressCity: true,
      addressCountry: true,
      addressCountryCode: true,
      addressFormatted: true,
      addressGeocodeSource: true,
      addressGranularity: true,
      addressLine1: true,
      addressLine2: true,
      addressPostalCode: true,
      addressState: true,
      addressStateCode: true,
      createdAt: true,
      geocodeConfidence: true,
      id: true,
      label: true,
      latitude: true,
      longitude: true,
      sortOrder: true,
      timezone: true,
      type: true,
      updatedAt: true,
      value: true,
    },
  },
  createdAt: true,
  emails: {
    select: {
      createdAt: true,
      id: true,
      preferred: true,
      sortOrder: true,
      type: true,
      updatedAt: true,
      value: true,
    },
  },
  firstName: true,
  hasAvatar: true,
  headline: true,
  id: true,
  importantDates: {
    select: {
      createdAt: true,
      date: true,
      id: true,
      note: true,
      notifyDaysBefore: true,
      notifyOn: true,
      type: true,
      updatedAt: true,
    },
  },
  keepFrequencyDays: true,
  language: true,
  lastInteraction: true,
  lastInteractionActivityId: true,
  lastName: true,
  latitude: true,
  linkedin: {
    select: {
      bio: true,
      educationHistory: {
        select: {
          createdAt: true,
          degree: true,
          description: true,
          endDate: true,
          id: true,
          schoolLinkedinId: true,
          schoolName: true,
          startDate: true,
          updatedAt: true,
        },
      },
      workHistory: {
        select: {
          companyLinkedinId: true,
          companyName: true,
          createdAt: true,
          description: true,
          employmentType: true,
          endDate: true,
          id: true,
          location: true,
          startDate: true,
          title: true,
          updatedAt: true,
        },
      },
    },
  },
  location: true,
  longitude: true,
  middleName: true,
  myself: true,
  notes: true,
  notesUpdatedAt: true,
  phones: {
    select: {
      createdAt: true,
      id: true,
      preferred: true,
      prefix: true,
      sortOrder: true,
      type: true,
      updatedAt: true,
      value: true,
    },
  },
  socials: {
    select: {
      connectedAt: true,
      createdAt: true,
      handle: true,
      id: true,
      platform: true,
      updatedAt: true,
    },
  },
  timezone: true,
  updatedAt: true,
} satisfies Prisma.PeopleSelect;

export function toIso(value: Date): string {
  return value.toISOString();
}

export function toIsoOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function mapPerson(row: PeopleExportRow): ExportPersonRecord {
  return {
    addresses: row.addresses.map(mapAddress),
    createdAt: toIso(row.createdAt),
    emails: row.emails.map(mapEmail),
    firstName: row.firstName,
    hasAvatar: row.hasAvatar,
    headline: row.headline,
    id: row.id,
    importantDates: row.importantDates.map(mapImportantDate),
    keepFrequencyDays: row.keepFrequencyDays,
    language: row.language,
    lastInteraction: toIsoOrNull(row.lastInteraction),
    lastInteractionActivityId: row.lastInteractionActivityId,
    lastName: row.lastName,
    latitude: row.latitude,
    linkedin: mapLinkedin(row.linkedin),
    location: row.location,
    longitude: row.longitude,
    middleName: row.middleName,
    notes: row.notes,
    notesUpdatedAt: toIsoOrNull(row.notesUpdatedAt),
    phones: row.phones.map(mapPhone),
    socials: row.socials.map(mapSocial),
    timezone: row.timezone,
    updatedAt: toIso(row.updatedAt),
  };
}
