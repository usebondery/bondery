import type { Prisma } from "@bondery/db";

function contains(search: string): Prisma.StringFilter {
  return { contains: search, mode: "insensitive" };
}

/**
 * One substring matches type, title, description, or a participant name.
 * `userId` stays on the interaction and on the participant person.
 */
export function buildInteractionListWhere(input: {
  contactId?: string;
  end_date?: string;
  search: string | null;
  start_date?: string;
  userId: string;
}): Prisma.InteractionWhereInput {
  const and: Prisma.InteractionWhereInput[] = [];

  if (input.contactId) {
    and.push({ participants: { some: { personId: input.contactId } } });
  }

  if (input.search) {
    const match = contains(input.search);
    and.push({
      OR: [
        { type: match },
        { title: match },
        { description: match },
        {
          participants: {
            some: {
              person: {
                OR: [{ firstName: match }, { lastName: match }, { middleName: match }],
                userId: input.userId,
              },
            },
          },
        },
      ],
    });
  }

  if (input.start_date || input.end_date) {
    and.push({
      date: {
        ...(input.end_date ? { lte: new Date(input.end_date) } : {}),
        ...(input.start_date ? { gte: new Date(input.start_date) } : {}),
      },
    });
  }

  return {
    userId: input.userId,
    ...(and.length > 0 ? { AND: and } : {}),
  };
}
