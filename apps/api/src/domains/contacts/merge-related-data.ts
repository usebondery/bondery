import type { PrismaClient } from "@bondery/db";
import { Prisma } from "@bondery/db";
import type { MergeConflictChoice, MergeConflictField } from "@bondery/schemas";
import { setContactHasAvatar } from "../../lib/contacts/avatar-storage.js";
import {
  areValuesEquivalent,
  hasMeaningfulValue,
  MERGEABLE_SOCIAL_FIELDS,
  normalizeImportantDateSet,
  resolveConflictChoice,
} from "../../lib/contacts/merge-helpers.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import {
  AVATARS_BUCKET,
  copyStorageObject,
  deleteStorageObjects,
} from "../../lib/storage/get-storage.js";
import { isUniqueViolation } from "../_shared/prisma-helpers.js";

type ConflictResolutions = Partial<Record<MergeConflictField, MergeConflictChoice>>;

type ImportantDateRow = {
  type: string;
  date: Date;
  note: string | null;
  notifyDaysBefore: number | null;
};

function resolveMergedImportantDates(
  leftDates: ImportantDateRow[],
  rightDates: ImportantDateRow[],
  conflictResolutions: ConflictResolutions,
) {
  const toComparable = (dates: ImportantDateRow[]) =>
    normalizeImportantDateSet(
      dates.map((event) => ({
        date: event.date.toISOString().slice(0, 10),
        note: event.note,
        notify_days_before: event.notifyDaysBefore,
        type: event.type,
      })),
    );

  const importantDatesEqual =
    JSON.stringify(toComparable(leftDates)) === JSON.stringify(toComparable(rightDates));

  if (leftDates.length === 0 && rightDates.length > 0) {
    return rightDates;
  }

  if (leftDates.length > 0 && rightDates.length > 0 && !importantDatesEqual) {
    const choice = resolveConflictChoice(conflictResolutions, "importantDates");
    return choice === "right" ? rightDates : leftDates;
  }

  return leftDates;
}

export async function mergeContactSocials(
  db: PrismaClient,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const socialRows = await db.peopleSocial.findMany({
    select: {
      connectedAt: true,
      handle: true,
      id: true,
      personId: true,
      platform: true,
    },
    where: { personId: { in: [leftPersonId, rightPersonId] }, userId },
  });

  const leftSocialByPlatform = new Map(
    socialRows.filter((row) => row.personId === leftPersonId).map((row) => [row.platform, row]),
  );

  const rightSocialByPlatform = new Map(
    socialRows.filter((row) => row.personId === rightPersonId).map((row) => [row.platform, row]),
  );

  const socialInserts: Array<{
    userId: string;
    personId: string;
    platform: string;
    handle: string;
    connectedAt: Date | null;
  }> = [];
  const socialUpdatePromises: Promise<unknown>[] = [];

  for (const [field, platform] of Object.entries(MERGEABLE_SOCIAL_FIELDS)) {
    const leftSocial = leftSocialByPlatform.get(platform);
    const rightSocial = rightSocialByPlatform.get(platform);

    if (!rightSocial || !hasMeaningfulValue(rightSocial.handle)) {
      continue;
    }

    if (!leftSocial) {
      socialInserts.push({
        connectedAt: rightSocial.connectedAt,
        handle: rightSocial.handle,
        personId: leftPersonId,
        platform,
        userId,
      });
      continue;
    }

    if (areValuesEquivalent(leftSocial.handle, rightSocial.handle)) {
      continue;
    }

    const choice = resolveConflictChoice(conflictResolutions, field as MergeConflictField);
    if (choice !== "right") {
      continue;
    }

    socialUpdatePromises.push(
      db.peopleSocial.update({
        data: {
          connectedAt: rightSocial.connectedAt,
          handle: rightSocial.handle,
          updatedAt: new Date(),
        },
        where: { id: leftSocial.id, userId },
      }),
    );
  }

  const socialWriteResults = await Promise.allSettled([
    ...(socialInserts.length > 0
      ? [
          db.peopleSocial.createMany({
            data: socialInserts,
            skipDuplicates: true,
          }),
        ]
      : []),
    ...socialUpdatePromises,
  ]);

  for (const result of socialWriteResults) {
    if (result.status === "rejected") {
      if (isUniqueViolation(result.reason)) {
        continue;
      }
      throw internal("contact_merge_socials_failed", String(result.reason));
    }
  }
}

export async function mergeContactGroupMemberships(
  db: PrismaClient,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
): Promise<void> {
  const rightGroupMemberships = await db.peopleGroup.findMany({
    select: { groupId: true },
    where: { personId: rightPersonId, userId },
  });

  if (rightGroupMemberships.length === 0) {
    return;
  }

  try {
    await db.peopleGroup.createMany({
      data: rightGroupMemberships.map((membership) => ({
        groupId: membership.groupId,
        personId: leftPersonId,
        userId,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    throw internal(
      "contact_merge_failed",
      error instanceof Error ? error.message : "contact_merge_failed",
    );
  }
}

export async function mergeContactInteractionParticipants(
  db: PrismaClient,
  leftPersonId: string,
  rightPersonId: string,
): Promise<void> {
  const rightParticipants = await db.interactionParticipant.findMany({
    select: { interactionId: true },
    where: { personId: rightPersonId },
  });

  if (rightParticipants.length === 0) {
    return;
  }

  try {
    await db.interactionParticipant.createMany({
      data: rightParticipants.map((participant) => ({
        interactionId: participant.interactionId,
        personId: leftPersonId,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    throw internal(
      "contact_merge_failed",
      error instanceof Error ? error.message : "contact_merge_failed",
    );
  }
}

export async function mergeContactImportantDates(
  db: PrismaClient,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const [leftImportantDates, rightImportantDates] = await Promise.all([
    db.peopleImportantDate.findMany({
      orderBy: { createdAt: "asc" },
      select: { date: true, note: true, notifyDaysBefore: true, type: true },
      where: { personId: leftPersonId, userId },
    }),
    db.peopleImportantDate.findMany({
      orderBy: { createdAt: "asc" },
      select: { date: true, note: true, notifyDaysBefore: true, type: true },
      where: { personId: rightPersonId, userId },
    }),
  ]);

  const mergedImportantDates = resolveMergedImportantDates(
    leftImportantDates,
    rightImportantDates,
    conflictResolutions,
  );

  await db.peopleImportantDate.deleteMany({
    where: { personId: leftPersonId, userId },
  });

  if (mergedImportantDates.length === 0) {
    return;
  }

  try {
    await db.peopleImportantDate.createMany({
      data: mergedImportantDates.map((event) => ({
        date: event.date,
        note: event.note,
        notifyDaysBefore: event.notifyDaysBefore,
        personId: leftPersonId,
        type: event.type,
        userId,
      })),
    });
  } catch (error) {
    throw internal(
      "contact_merge_failed",
      error instanceof Error ? error.message : "contact_merge_failed",
    );
  }
}

export async function mergeContactRelationships(
  db: PrismaClient,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
): Promise<void> {
  const relationshipsToTransfer = await db.peopleRelationship.findMany({
    select: { relationshipType: true, sourcePersonId: true, targetPersonId: true },
    where: {
      OR: [{ sourcePersonId: rightPersonId }, { targetPersonId: rightPersonId }],
      userId,
    },
  });

  const relationshipRows = relationshipsToTransfer
    .map((relationship) => {
      const nextSourcePersonId =
        relationship.sourcePersonId === rightPersonId ? leftPersonId : relationship.sourcePersonId;
      const nextTargetPersonId =
        relationship.targetPersonId === rightPersonId ? leftPersonId : relationship.targetPersonId;

      if (nextSourcePersonId === nextTargetPersonId) {
        return null;
      }

      return {
        relationshipType: relationship.relationshipType,
        sourcePersonId: nextSourcePersonId,
        targetPersonId: nextTargetPersonId,
        userId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (relationshipRows.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    relationshipRows.map((row) =>
      db.peopleRelationship.create({
        data: row,
      }),
    ),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      const error = result.reason;
      if (
        isUniqueViolation(error) ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2004" || error.message.includes("23514")))
      ) {
        continue;
      }
      throw internal(
        "contact_merge_failed",
        error instanceof Error ? error.message : "contact_merge_failed",
      );
    }
  }
}

export async function mergeContactAvatar(
  db: PrismaClient,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  leftHasAvatar: boolean,
  rightHasAvatar: boolean,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const rightAvatarPath = `${userId}/${rightPersonId}.jpg`;
  const leftAvatarPath = `${userId}/${leftPersonId}.jpg`;

  if (resolveConflictChoice(conflictResolutions, "avatar") === "right") {
    await copyStorageObject(AVATARS_BUCKET, rightAvatarPath, leftAvatarPath, "image/jpeg");
  }

  await deleteStorageObjects(AVATARS_BUCKET, [rightAvatarPath]);

  const avatarChoice = resolveConflictChoice(conflictResolutions, "avatar");
  const survivorHasAvatar = avatarChoice === "right" ? rightHasAvatar : leftHasAvatar;

  await setContactHasAvatar(db, userId, leftPersonId, survivorHasAvatar);
}
