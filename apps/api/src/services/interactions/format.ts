import type { AvatarTransformOptions, InteractionType } from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";

const interactionPersonSelect = {
  avatarUpdatedAt: true,
  firstName: true,
  hasAvatar: true,
  id: true,
  lastName: true,
  updatedAt: true,
} as const;

type InteractionPersonRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  hasAvatar: boolean;
  avatarUpdatedAt: Date | null;
  updatedAt: Date;
};

export function mapInteractionParticipant(
  userId: string,
  person: InteractionPersonRow,
  avatarOptions?: AvatarTransformOptions,
) {
  return {
    avatar: resolveContactAvatarUrl(
      userId,
      {
        avatarUpdatedAt: person.avatarUpdatedAt,
        hasAvatar: person.hasAvatar,
        id: person.id,
      },
      avatarOptions,
    ),
    firstName: person.firstName,
    id: person.id,
    lastName: person.lastName,
    updatedAt: person.updatedAt.toISOString(),
  };
}

function formatInteractionRow(
  userId: string,
  interaction: {
    id: string;
    userId: string;
    type: string;
    title: string | null;
    description: string | null;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
    participants: Array<{ person: InteractionPersonRow }>;
  },
  avatarOptions?: AvatarTransformOptions,
  options?: { includeUserId?: boolean },
) {
  const formatted = {
    createdAt: interaction.createdAt.toISOString(),
    date: interaction.date.toISOString(),
    description: interaction.description,
    id: interaction.id,
    participants: interaction.participants.map((participant) =>
      mapInteractionParticipant(userId, participant.person, avatarOptions),
    ),
    title: interaction.title,
    type: interaction.type as InteractionType,
    updatedAt: interaction.updatedAt.toISOString(),
  };

  if (options?.includeUserId) {
    return { ...formatted, userId: interaction.userId };
  }

  return formatted;
}

export async function loadFormattedInteraction(
  ctx: Pick<DomainContext, "db" | "user">,
  interactionId: string,
  avatarOptions?: AvatarTransformOptions,
) {
  const db = domainDb(ctx as DomainContext);
  const { user } = ctx;

  const interaction = await db.interaction.findFirst({
    include: {
      participants: {
        include: {
          person: { select: interactionPersonSelect },
        },
      },
    },
    where: { id: interactionId, userId: user.id },
  });

  if (!interaction) {
    return null;
  }

  return formatInteractionRow(user.id, interaction, avatarOptions);
}

export async function loadFormattedInteractions(
  ctx: Pick<DomainContext, "db" | "user">,
  interactionIds: string[],
  avatarOptions?: AvatarTransformOptions,
) {
  if (interactionIds.length === 0) {
    return [];
  }

  const db = domainDb(ctx as DomainContext);
  const { user } = ctx;

  const interactions = await db.interaction.findMany({
    include: {
      participants: {
        include: {
          person: { select: interactionPersonSelect },
        },
      },
    },
    where: { id: { in: interactionIds }, userId: user.id },
  });

  const byId = new Map(
    interactions.map((interaction) => [
      interaction.id,
      formatInteractionRow(user.id, interaction, avatarOptions, { includeUserId: true }),
    ]),
  );

  return interactionIds
    .map((id) => byId.get(id))
    .filter((interaction): interaction is NonNullable<typeof interaction> => interaction != null);
}
