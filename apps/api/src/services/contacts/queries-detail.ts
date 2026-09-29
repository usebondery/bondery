import type {
  AvatarTransformOptions,
  Contact,
  GroupWithCount,
  ImportantDateType,
  RelationshipType,
  Tag,
} from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { toGroupDto, toTagDto } from "../../domains/_shared/prisma-helpers.js";
import { attachContactExtras, loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import { findPersonIdBySocial } from "../../lib/contacts/socials.js";
import { generateVCard } from "../../lib/contacts/vcard.js";
import { contactDetailSelect, mapContactDetailRecord } from "../../lib/data/prisma-mappers.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { badRequest, internal, notFound } from "../../lib/platform/errors/http-errors.js";
import { withEmptyChannels, withEmptySocials } from "./helpers.js";
import {
  type BySocialQuery,
  IMPORTANT_DATE_TYPES,
  isLookupPlatform,
  type ServiceLog,
  toContactPreview,
} from "./queries-shared.js";

type ContactDetailContext = Pick<DomainContext, "db" | "user"> & { log?: ServiceLog };

export async function getContact(
  ctx: ContactDetailContext,
  contactId: string,
  avatarOptions?: AvatarTransformOptions,
) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const enrichedContact = await loadEnrichedContact(
    db,
    user.id,
    contactId,
    { avatarOptions },
    ctx.log,
  );

  if (!enrichedContact) {
    throw notFound("Contact not found", "contact_not_found");
  }

  return { contact: enrichedContact };
}

export async function listContactRelationships(
  ctx: ContactDetailContext,
  personId: string,
  avatarOptions?: AvatarTransformOptions,
) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);

  const person = await db.people.findFirst({
    select: { id: true },
    where: { id: personId, userId: user.id },
  });

  if (!person) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const rows = await db.peopleRelationship.findMany({
    orderBy: { createdAt: "asc" },
    where: {
      OR: [{ sourcePersonId: personId }, { targetPersonId: personId }],
      userId: user.id,
    },
  });

  if (rows.length === 0) {
    return { relationships: [] };
  }

  const personIds = [
    ...new Set(
      rows.flatMap((relationship) => [relationship.sourcePersonId, relationship.targetPersonId]),
    ),
  ];

  const peopleRows = await db.people.findMany({
    select: {
      firstName: true,
      hasAvatar: true,
      id: true,
      lastName: true,
      updatedAt: true,
    },
    where: { id: { in: personIds }, userId: user.id },
  });

  const peopleById = new Map(peopleRows.map((personRow) => [personRow.id, personRow]));

  const relationships = rows.flatMap((relationship) => {
    const sourcePerson = peopleById.get(relationship.sourcePersonId);
    const targetPerson = peopleById.get(relationship.targetPersonId);
    if (!sourcePerson || !targetPerson) {
      return [];
    }

    return [
      {
        createdAt: relationship.createdAt.toISOString(),
        id: relationship.id,
        relationshipType: relationship.relationshipType as RelationshipType,
        sourcePerson: toContactPreview(
          user.id,
          {
            firstName: sourcePerson.firstName,
            hasAvatar: sourcePerson.hasAvatar,
            id: sourcePerson.id,
            lastName: sourcePerson.lastName,
            updatedAt: sourcePerson.updatedAt.toISOString(),
          },
          avatarOptions,
        ),
        sourcePersonId: relationship.sourcePersonId,
        targetPerson: toContactPreview(
          user.id,
          {
            firstName: targetPerson.firstName,
            hasAvatar: targetPerson.hasAvatar,
            id: targetPerson.id,
            lastName: targetPerson.lastName,
            updatedAt: targetPerson.updatedAt.toISOString(),
          },
          avatarOptions,
        ),
        targetPersonId: relationship.targetPersonId,
        updatedAt: relationship.updatedAt.toISOString(),
        userId: relationship.userId,
      },
    ];
  });

  return { relationships };
}

export async function findContactBySocial(ctx: ContactDetailContext, query: BySocialQuery) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const platform = query.platform?.trim() ?? "";
  const handle = query.handle?.trim() ?? "";
  const avatarOpts = extractAvatarOptions(query);

  if (!platform || !handle || !isLookupPlatform(platform)) {
    throw badRequest("Invalid platform or handle", "bad_request");
  }

  const personId = await findPersonIdBySocial(db, user.id, platform, handle);

  if (!personId) {
    return { exists: false as const };
  }

  const person = await db.people.findFirst({
    select: {
      firstName: true,
      hasAvatar: true,
      id: true,
      lastName: true,
      updatedAt: true,
    },
    where: { id: personId, userId: user.id },
  });

  if (!person) {
    throw internal("internal_server_error", "Failed to find contact");
  }

  return {
    contact: toContactPreview(
      user.id,
      {
        firstName: person.firstName,
        hasAvatar: person.hasAvatar,
        id: person.id,
        lastName: person.lastName,
        updatedAt: person.updatedAt.toISOString(),
      },
      avatarOpts,
    ),
    exists: true as const,
  };
}

export async function getContactGroups(
  db: ReturnType<typeof domainDb>,
  userId: string,
  personId: string,
) {
  const contact = await db.people.findFirst({
    select: { id: true },
    where: { id: personId, userId },
  });

  if (!contact) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const memberships = await db.peopleGroup.findMany({
    select: { groupId: true },
    where: { personId, userId },
  });

  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return { groups: [] as GroupWithCount[] };
  }

  const [groups, groupMemberships] = await Promise.all([
    db.group.findMany({
      orderBy: { label: "asc" },
      where: { id: { in: groupIds }, userId },
    }),
    db.peopleGroup.findMany({
      select: { groupId: true },
      where: { groupId: { in: groupIds }, userId },
    }),
  ]);

  const countMap = new Map<string, number>();
  for (const item of groupMemberships) {
    const current = countMap.get(item.groupId) ?? 0;
    countMap.set(item.groupId, current + 1);
  }

  const groupsWithCounts: GroupWithCount[] = groups.map((group) => ({
    ...toGroupDto(group),
    contactCount: countMap.get(group.id) ?? 0,
  }));

  return { groups: groupsWithCounts };
}

export async function getContactTags(
  db: ReturnType<typeof domainDb>,
  userId: string,
  personId: string,
) {
  const contact = await db.people.findFirst({
    select: { id: true },
    where: { id: personId, userId },
  });

  if (!contact) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const memberships = await db.peopleTag.findMany({
    include: { tag: true },
    orderBy: { tag: { label: "asc" } },
    where: { personId, userId },
  });

  const tags: Tag[] = memberships.map((membership) => toTagDto(membership.tag));

  return { tags };
}

export async function getContactVCardExport(
  ctx: ContactDetailContext,
  contactId: string,
  avatarOptions?: AvatarTransformOptions,
) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const contact = await db.people.findFirst({
    select: contactDetailSelect,
    where: { id: contactId, userId: user.id },
  });

  if (!contact) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const mappedContact = mapContactDetailRecord(contact);

  let contactWithChannels: Contact;
  try {
    const [enrichedContact] = await attachContactExtras(db, user.id, [mappedContact], {
      addresses: true,
      avatarOptions,
    });
    contactWithChannels = enrichedContact as Contact;
  } catch (channelError) {
    ctx.log?.error(
      { channelError },
      "Failed to attach contact channels/social media for vCard export",
    );
    contactWithChannels = withEmptySocials(
      withEmptyChannels([mappedContact]),
    )[0] as unknown as Contact;
  }

  let exportImportantDates: Array<{
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
  }> = [];
  let exportCategories: string[] = [];

  try {
    const [importantDates, peopleTags] = await Promise.all([
      db.peopleImportantDate.findMany({
        select: { date: true, type: true },
        where: { personId: contactId, userId: user.id },
      }),
      db.peopleTag.findMany({
        select: { tagId: true },
        where: { personId: contactId, userId: user.id },
      }),
    ]);

    exportImportantDates = importantDates
      .map((entry) => ({
        date: entry.date.toISOString().slice(0, 10),
        type: entry.type,
      }))
      .filter(
        (
          entry,
        ): entry is {
          type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
          date: string;
        } =>
          IMPORTANT_DATE_TYPES.includes(entry.type as ImportantDateType) &&
          typeof entry.date === "string" &&
          entry.date.trim().length > 0,
      );

    const tagIds = Array.from(new Set(peopleTags.map((entry) => entry.tagId).filter(Boolean)));

    if (tagIds.length > 0) {
      const tags = await db.tag.findMany({
        select: { label: true },
        where: { id: { in: tagIds }, userId: user.id },
      });

      exportCategories = Array.from(
        new Set(tags.map((entry) => entry.label).filter((label): label is string => !!label)),
      );
    }
  } catch (extrasError) {
    ctx.log?.warn?.({ extrasError }, "Failed to fetch important dates/tags for vCard export");
  }

  let vcard: string;
  try {
    vcard = await generateVCard(contactWithChannels, {
      categories: exportCategories,
      importantDates: exportImportantDates,
    });
  } catch (vcardError) {
    ctx.log?.error({ vcardError }, "Failed to generate vCard");
    throw internal("failed_to_generate_vcard");
  }

  const firstName = mappedContact.firstName || "contact";
  const lastName = mappedContact.lastName || "";
  const filename = lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;

  return { filename, vcard };
}
