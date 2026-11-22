import type { Prisma } from "@bondery/db";
import { remapImportId } from "@bondery/helpers/ids";
import type { ImportResult } from "@bondery/schemas";
import type { SyncChange } from "@bondery/schemas/sync";
import type { ParsedBonderyExport } from "../../lib/import/parse-bondery-export-zip.js";
import { sanitizeNotesHtml } from "../../lib/notes/sanitize-notes-html.js";
import {
  buildGroupRowChange,
  buildPeopleTagChangeFromRow,
  buildTagRowChange,
} from "../../lib/sync/build-changes.js";
import { markBulkImportCompleted } from "../../services/import/followup.js";
import type { DomainContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { toPeopleGroupSyncRow, toPeopleTagSyncRow, toSyncRow } from "../_shared/prisma-helpers.js";
import { scheduleMergeRecommendationsRefresh } from "../contacts/merge-recommendations.js";
import { attachImportedPhotos } from "./import-apply-photos.js";
import {
  asDate,
  asDateOrNull,
  createManyCounted,
  createManyReturning,
  emitSyncChunks,
  isValidLatLng,
  setGisPoint,
  typeResult,
  upsertChange,
} from "./import-helpers.js";

export async function applyParsedImport(
  ctx: DomainContext,
  parsed: ParsedBonderyExport,
): Promise<ImportResult> {
  const db = domainDb(ctx);
  const userId = ctx.user.id;

  const myselfSourceIds = new Set(parsed.myself.map((person) => person.id));

  const remapPersonId = (sourceId: string): string => {
    if (myselfSourceIds.has(sourceId)) {
      return userId;
    }
    return remapImportId({ sourceId, table: "people", userId });
  };

  const knownPersonIds = new Set<string>([userId]);
  for (const person of parsed.myself) {
    knownPersonIds.add(remapPersonId(person.id));
  }
  for (const person of parsed.people) {
    knownPersonIds.add(remapPersonId(person.id));
  }

  const peopleToInsert = parsed.people;

  const groupRows = parsed.groups.map((group) => ({
    color: group.color,
    createdAt: asDate(group.createdAt),
    emoji: group.emoji,
    id: remapImportId({ sourceId: group.id, table: "groups", userId }),
    label: group.label,
    updatedAt: asDate(group.updatedAt),
    userId,
  }));

  const tagRows = parsed.tags.map((tag) => ({
    color: tag.color,
    createdAt: asDate(tag.createdAt),
    id: remapImportId({ sourceId: tag.id, table: "tags", userId }),
    label: tag.label,
    updatedAt: asDate(tag.updatedAt),
    userId,
  }));

  const knownGroupIds = new Set(groupRows.map((row) => row.id));
  const knownTagIds = new Set(tagRows.map((row) => row.id));

  const insertedGroups = await createManyReturning(groupRows, (data) =>
    db.group.createManyAndReturn({ data, skipDuplicates: true }),
  );
  const insertedTags = await createManyReturning(tagRows, (data) =>
    db.tag.createManyAndReturn({ data, skipDuplicates: true }),
  );

  const personRows = peopleToInsert.map((person) => ({
    createdAt: asDate(person.createdAt),
    firstName: person.firstName,
    hasAvatar: false,
    headline: person.headline,
    id: remapPersonId(person.id),
    keepFrequencyDays: person.keepFrequencyDays,
    language: person.language,
    lastInteraction: asDateOrNull(person.lastInteraction),
    lastName: person.lastName,
    latitude: person.latitude,
    location: person.location,
    longitude: person.longitude,
    middleName: person.middleName,
    myself: false,
    // ZIP content is client-controlled: sanitize like any other notes write.
    notes: sanitizeNotesHtml(person.notes),
    notesUpdatedAt: asDateOrNull(person.notesUpdatedAt),
    timezone: person.timezone,
    updatedAt: asDate(person.updatedAt),
    userId,
  }));

  const insertedPeople = await createManyReturning(personRows, (data) =>
    db.people.createManyAndReturn({ data, skipDuplicates: true }),
  );
  const insertedPersonIds = new Set(insertedPeople.map((row) => row.id));
  const photosResult = await attachImportedPhotos({
    db,
    insertedPeople,
    insertedPersonIds,
    photos: parsed.photos,
    photosSkipped: parsed.photosSkipped,
    remapPersonId,
    userId,
  });

  const phoneRows = peopleToInsert.flatMap((person) =>
    person.phones.map((phone) => ({
      createdAt: asDate(phone.createdAt),
      id: remapImportId({ sourceId: phone.id, table: "people_phones", userId }),
      personId: remapPersonId(person.id),
      preferred: phone.preferred,
      prefix: phone.prefix,
      sortOrder: phone.sortOrder,
      type: phone.type,
      updatedAt: asDate(phone.updatedAt),
      userId,
      value: phone.value,
    })),
  );
  const emailRows = peopleToInsert.flatMap((person) =>
    person.emails.map((email) => ({
      createdAt: asDate(email.createdAt),
      id: remapImportId({ sourceId: email.id, table: "people_emails", userId }),
      personId: remapPersonId(person.id),
      preferred: email.preferred,
      sortOrder: email.sortOrder,
      type: email.type,
      updatedAt: asDate(email.updatedAt),
      userId,
      value: email.value,
    })),
  );
  const socialRows = peopleToInsert.flatMap((person) =>
    person.socials.map((social) => ({
      connectedAt: asDateOrNull(social.connectedAt),
      createdAt: asDate(social.createdAt),
      handle: social.handle,
      id: remapImportId({ sourceId: social.id, table: "people_socials", userId }),
      personId: remapPersonId(person.id),
      platform: social.platform,
      updatedAt: asDate(social.updatedAt),
      userId,
    })),
  );
  const addressRows = peopleToInsert.flatMap((person) =>
    person.addresses.map((address) => ({
      addressCity: address.addressCity,
      addressCountry: address.addressCountry,
      addressCountryCode: address.addressCountryCode,
      addressFormatted: address.addressFormatted,
      addressGeocodeSource: address.addressGeocodeSource,
      addressGranularity: address.addressGranularity,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      addressPostalCode: address.addressPostalCode,
      addressState: address.addressState,
      addressStateCode: address.addressStateCode,
      createdAt: asDate(address.createdAt),
      geocodeConfidence: address.geocodeConfidence,
      id: remapImportId({ sourceId: address.id, table: "people_addresses", userId }),
      label: address.label,
      latitude: address.latitude,
      longitude: address.longitude,
      personId: remapPersonId(person.id),
      sortOrder: address.sortOrder,
      timezone: address.timezone,
      type: address.type,
      updatedAt: asDate(address.updatedAt),
      userId,
      value: address.value,
    })),
  );
  const importantDateRows = peopleToInsert.flatMap((person) =>
    person.importantDates.map((item) => ({
      createdAt: asDate(item.createdAt),
      date: asDate(item.date),
      id: remapImportId({ sourceId: item.id, table: "people_important_dates", userId }),
      note: item.note,
      notifyDaysBefore: item.notifyDaysBefore,
      notifyOn: asDateOrNull(item.notifyOn),
      personId: remapPersonId(person.id),
      type: item.type,
      updatedAt: asDate(item.updatedAt),
      userId,
    })),
  );

  const insertedPhones = await createManyReturning(phoneRows, (data) =>
    db.peoplePhone.createManyAndReturn({ data, skipDuplicates: true }),
  );
  const insertedEmails = await createManyReturning(emailRows, (data) =>
    db.peopleEmail.createManyAndReturn({ data, skipDuplicates: true }),
  );
  const insertedSocials = await createManyReturning(socialRows, (data) =>
    db.peopleSocial.createManyAndReturn({ data, skipDuplicates: true }),
  );
  const insertedAddresses = await createManyReturning(addressRows, (data) =>
    db.peopleAddress.createManyAndReturn({ data, skipDuplicates: true }),
  );
  const insertedImportantDates = await createManyReturning(importantDateRows, (data) =>
    db.peopleImportantDate.createManyAndReturn({ data, skipDuplicates: true }),
  );

  const linkedinRows: Prisma.PeopleLinkedinCreateManyInput[] = [];
  const workRows: Prisma.PeopleWorkHistoryCreateManyInput[] = [];
  const educationRows: Prisma.PeopleEducationHistoryCreateManyInput[] = [];
  for (const person of peopleToInsert) {
    if (!person.linkedin) {
      continue;
    }
    const personId = remapPersonId(person.id);
    const peopleLinkedinId = remapImportId({
      sourceId: person.id,
      table: "people_linkedin",
      userId,
    });
    linkedinRows.push({
      bio: person.linkedin.bio,
      createdAt: asDate(person.createdAt),
      id: peopleLinkedinId,
      personId,
      updatedAt: asDate(person.updatedAt),
      userId,
    });
    for (const work of person.linkedin.workHistory) {
      workRows.push({
        companyLinkedinId: work.companyLinkedinId,
        companyName: work.companyName,
        createdAt: asDate(work.createdAt),
        description: work.description,
        employmentType: work.employmentType,
        endDate: asDateOrNull(work.endDate),
        id: remapImportId({ sourceId: work.id, table: "people_work_history", userId }),
        location: work.location,
        peopleLinkedinId,
        startDate: asDateOrNull(work.startDate),
        title: work.title,
        updatedAt: asDate(work.updatedAt),
        userId,
      });
    }
    for (const education of person.linkedin.educationHistory) {
      educationRows.push({
        createdAt: asDate(education.createdAt),
        degree: education.degree,
        description: education.description,
        endDate: asDateOrNull(education.endDate),
        id: remapImportId({ sourceId: education.id, table: "people_education_history", userId }),
        peopleLinkedinId,
        schoolLinkedinId: education.schoolLinkedinId,
        schoolName: education.schoolName,
        startDate: asDateOrNull(education.startDate),
        updatedAt: asDate(education.updatedAt),
        userId,
      });
    }
  }

  await createManyCounted(linkedinRows, (data) =>
    db.peopleLinkedin.createMany({ data, skipDuplicates: true }),
  );
  await createManyCounted(workRows, (data) =>
    db.peopleWorkHistory.createMany({ data, skipDuplicates: true }),
  );
  await createManyCounted(educationRows, (data) =>
    db.peopleEducationHistory.createMany({ data, skipDuplicates: true }),
  );

  const interactionRows = parsed.interactions.map((interaction) => ({
    createdAt: asDate(interaction.createdAt),
    date: asDate(interaction.date),
    description: interaction.description,
    id: remapImportId({ sourceId: interaction.id, table: "interactions", userId }),
    title: interaction.title,
    type: interaction.type,
    updatedAt: asDate(interaction.updatedAt),
    userId,
  }));
  const insertedInteractions = await createManyReturning(interactionRows, (data) =>
    db.interaction.createManyAndReturn({ data, skipDuplicates: true }),
  );
  const insertedInteractionIds = new Set(insertedInteractions.map((row) => row.id));

  const participantRows: Prisma.InteractionParticipantCreateManyInput[] = [];
  let skippedParticipants = 0;
  for (const interaction of parsed.interactions) {
    const interactionId = remapImportId({
      sourceId: interaction.id,
      table: "interactions",
      userId,
    });
    for (const participantSourceId of interaction.participantIds) {
      const personId = remapPersonId(participantSourceId);
      if (!knownPersonIds.has(personId)) {
        skippedParticipants += 1;
        continue;
      }
      participantRows.push({
        createdAt: asDate(interaction.createdAt),
        interactionId,
        personId,
      });
    }
  }
  await createManyCounted(participantRows, (data) =>
    db.interactionParticipant.createMany({ data, skipDuplicates: true }),
  );

  for (const person of peopleToInsert) {
    const personId = remapPersonId(person.id);
    if (!insertedPersonIds.has(personId) || !person.lastInteractionActivityId) {
      continue;
    }
    const interactionId = remapImportId({
      sourceId: person.lastInteractionActivityId,
      table: "interactions",
      userId,
    });
    if (!insertedInteractionIds.has(interactionId)) {
      continue;
    }
    await db.people.updateMany({
      data: { lastInteractionActivityId: interactionId },
      where: { id: personId, userId },
    });
  }

  const relationshipRows: Prisma.PeopleRelationshipCreateManyInput[] = [];
  let skippedRelationships = 0;
  for (const relationship of parsed.relationships) {
    const sourcePersonId = remapPersonId(relationship.sourcePersonId);
    const targetPersonId = remapPersonId(relationship.targetPersonId);
    if (!knownPersonIds.has(sourcePersonId) || !knownPersonIds.has(targetPersonId)) {
      skippedRelationships += 1;
      continue;
    }
    relationshipRows.push({
      createdAt: asDate(relationship.createdAt),
      id: remapImportId({ sourceId: relationship.id, table: "people_relationships", userId }),
      relationshipType: relationship.relationshipType,
      sourcePersonId,
      targetPersonId,
      updatedAt: asDate(relationship.updatedAt),
      userId,
    });
  }
  const insertedRelationships = await createManyCounted(relationshipRows, (data) =>
    db.peopleRelationship.createMany({ data, skipDuplicates: true }),
  );

  const groupMembershipRows: Prisma.PeopleGroupCreateManyInput[] = [];
  let skippedGroupMemberships = 0;
  for (const membership of parsed.groupMemberships) {
    const personId = remapPersonId(membership.personId);
    const groupId = remapImportId({ sourceId: membership.groupId, table: "groups", userId });
    if (!knownPersonIds.has(personId) || !knownGroupIds.has(groupId)) {
      skippedGroupMemberships += 1;
      continue;
    }
    groupMembershipRows.push({
      createdAt: asDate(membership.createdAt),
      groupId,
      id: remapImportId({ sourceId: membership.id, table: "people_groups", userId }),
      personId,
      userId,
    });
  }
  const insertedGroupMemberships = await createManyReturning(groupMembershipRows, (data) =>
    db.peopleGroup.createManyAndReturn({ data, skipDuplicates: true }),
  );

  const tagMembershipRows: Prisma.PeopleTagCreateManyInput[] = [];
  let skippedTagMemberships = 0;
  for (const membership of parsed.tagMemberships) {
    const personId = remapPersonId(membership.personId);
    const tagId = remapImportId({ sourceId: membership.tagId, table: "tags", userId });
    if (!knownPersonIds.has(personId) || !knownTagIds.has(tagId)) {
      skippedTagMemberships += 1;
      continue;
    }
    tagMembershipRows.push({
      createdAt: asDate(membership.createdAt),
      id: remapImportId({ sourceId: membership.id, table: "people_tags", userId }),
      personId,
      tagId,
      userId,
    });
  }
  const insertedTagMemberships = await createManyReturning(tagMembershipRows, (data) =>
    db.peopleTag.createManyAndReturn({ data, skipDuplicates: true }),
  );

  const gisJobs: Promise<void>[] = [];
  for (const person of insertedPeople) {
    if (
      person.latitude !== null &&
      person.longitude !== null &&
      isValidLatLng(person.latitude, person.longitude)
    ) {
      gisJobs.push(setGisPoint(db, "people", person.id, userId, person.latitude, person.longitude));
    }
  }
  for (const address of insertedAddresses) {
    if (
      address.latitude !== null &&
      address.longitude !== null &&
      isValidLatLng(address.latitude, address.longitude)
    ) {
      gisJobs.push(
        setGisPoint(
          db,
          "people_addresses",
          address.id,
          userId,
          address.latitude,
          address.longitude,
        ),
      );
    }
  }
  try {
    await Promise.all(gisJobs);
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to set GIS points after Bondery import writes");
  }

  const syncChanges: SyncChange[] = [
    ...insertedPeople.map((row) => upsertChange("people", toSyncRow(row))),
    ...insertedGroups.map((row) => buildGroupRowChange(toSyncRow(row))),
    ...insertedTags.map((row) => buildTagRowChange(toSyncRow(row))),
    ...insertedPhones.map((row) => upsertChange("people_phones", toSyncRow(row))),
    ...insertedEmails.map((row) => upsertChange("people_emails", toSyncRow(row))),
    ...insertedAddresses.map((row) => upsertChange("people_addresses", toSyncRow(row))),
    ...insertedSocials.map((row) => upsertChange("people_socials", toSyncRow(row))),
    ...insertedImportantDates.map((row) => upsertChange("people_important_dates", toSyncRow(row))),
    ...insertedGroupMemberships.map((row) =>
      upsertChange("people_groups", toPeopleGroupSyncRow(row)),
    ),
    ...insertedTagMemberships.map((row) => buildPeopleTagChangeFromRow(toPeopleTagSyncRow(row))),
  ];
  try {
    await emitSyncChunks(ctx, db, syncChanges);
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to emit sync changelog after Bondery import writes");
  }

  scheduleMergeRecommendationsRefresh(ctx);

  if (parsed.people.length > 0) {
    try {
      await markBulkImportCompleted(ctx);
    } catch (error) {
      ctx.log?.error({ err: error }, "Failed to mark bulk import completed after writes");
    }
  }

  return {
    groupMemberships: typeResult(
      groupMembershipRows.length,
      insertedGroupMemberships.length,
      skippedGroupMemberships,
    ),
    groups: typeResult(groupRows.length, insertedGroups.length),
    interactions: typeResult(
      interactionRows.length,
      insertedInteractions.length,
      skippedParticipants,
    ),
    people: typeResult(personRows.length, insertedPeople.length),
    photos: photosResult,
    relationships: typeResult(relationshipRows.length, insertedRelationships, skippedRelationships),
    tagMemberships: typeResult(
      tagMembershipRows.length,
      insertedTagMemberships.length,
      skippedTagMemberships,
    ),
    tags: typeResult(tagRows.length, insertedTags.length),
  };
}
