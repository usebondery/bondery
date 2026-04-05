import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { OnboardingIntent } from "@/app/(app)/app/onboarding/OnboardingContext";

interface SampleContact {
  firstName: string;
  lastName: string;
  headline?: string;
  location?: string;
  notes?: string;
  timezone?: string;
  birthday?: string;
}

interface SampleGroup {
  label: string;
  emoji?: string;
  color: string;
  /** Indices into the contacts array to assign after creation. */
  contactIndices: number[];
}

interface SampleTag {
  label: string;
  /** Indices into the contacts array to assign after creation. */
  contactIndices: number[];
}

interface SampleInteraction {
  type: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  title?: string;
  description?: string;
  /** Indices into the contacts array to use as participants. */
  participantIndices: number[];
}

interface SeedDataSet {
  contacts: SampleContact[];
  groups: SampleGroup[];
  tags: SampleTag[];
  interactions: SampleInteraction[];
}

const PROFESSIONAL_CONTACTS: SampleContact[] = [
  {
    firstName: "Albert",
    lastName: "Einstein",
    headline: "Theoretical Physicist · Theory of Relativity",
    location: "Princeton, New Jersey, United States",
    notes:
      "Pioneer of modern physics. Author of the special and general theories of relativity. Remind yourself that simplicity in thinking is a superpower.",
    timezone: "America/New_York",
    birthday: "1879-03-14",
  },
  {
    firstName: "Alan",
    lastName: "Turing",
    headline: "Father of Computer Science & AI",
    location: "London, United Kingdom",
    notes:
      "Founder of theoretical computer science and artificial intelligence. His 1950 paper 'Computing Machinery and Intelligence' introduced the Turing Test.",
    timezone: "Europe/London",
    birthday: "1912-06-23",
  },
  {
    firstName: "Mark",
    lastName: "Granovetter",
    headline: "Sociologist · The Strength of Weak Ties",
    location: "Stanford, California, United States",
    notes:
      "His 1973 paper 'The Strength of Weak Ties' is one of the most-cited papers in sociology. Weak ties — casual acquaintances — are often more valuable than close friends for finding opportunities.",
    timezone: "America/Los_Angeles",
    birthday: "1943-10-20",
  },
  {
    firstName: "Simon",
    lastName: "Sinek",
    headline: "Author & Leadership Speaker · Start With Why",
    location: "New York, United States",
    notes:
      "Known for the Golden Circle framework and 'Start With Why'. His TED talk is one of the most-watched ever. Great perspective on servant leadership.",
    timezone: "America/New_York",
  },
  {
    firstName: "Ada",
    lastName: "Lovelace",
    headline: "World's First Computer Programmer",
    location: "London, United Kingdom",
    notes:
      "Wrote the first algorithm intended to be processed by a machine, for Babbage's Analytical Engine. A visionary who saw the potential of computing 100 years before it existed.",
    timezone: "Europe/London",
    birthday: "1815-12-10",
  },
  {
    firstName: "Peter",
    lastName: "Drucker",
    headline: "Father of Modern Management · Author",
    location: "Claremont, California, United States",
    notes:
      "Author of 39 books on management. Coined the term 'knowledge worker'. His advice: 'Manage your boss as much as your subordinates.'",
    timezone: "America/Los_Angeles",
    birthday: "1909-11-19",
  },
  {
    firstName: "Clayton",
    lastName: "Christensen",
    headline: "Business Professor · The Innovator's Dilemma",
    location: "Boston, Massachusetts, United States",
    notes:
      "HBS professor who introduced disruptive innovation theory. The Jobs-to-be-Done framework originated largely from his research.",
    timezone: "America/New_York",
    birthday: "1952-04-06",
  },
];

const PERSONAL_CONTACTS: SampleContact[] = [
  {
    firstName: "Emma",
    lastName: "Johnson",
    headline: "Yoga teacher · Best friend",
    location: "New York, United States",
    notes:
      "Met at a yoga class in 2018. Always up for hiking or trying new restaurants. Her cat is named Mango.",
    timezone: "America/New_York",
  },
  {
    firstName: "David",
    lastName: "Williams",
    headline: "Software engineer · Brother",
    location: "San Francisco, California, United States",
    notes:
      "My brother. Works at a startup in SF. We try to catch up at least once a month. Loves hiking and cooking.",
    timezone: "America/Los_Angeles",
  },
  {
    firstName: "Sarah",
    lastName: "Miller",
    headline: "Retired teacher · Mom",
    location: "Prague, Czechia",
    notes:
      "My mom. Retired after 30 years of teaching. Lives in Prague, loves gardening and sending care packages.",
    timezone: "Europe/Prague",
    birthday: "1958-06-12",
  },
  {
    firstName: "Michael",
    lastName: "Brown",
    headline: "Architect · Childhood friend",
    location: "Boston, Massachusetts, United States",
    notes:
      "Childhood friend. Reconnected after 10 years at a school reunion in 2022. Huge Red Sox fan.",
    timezone: "America/New_York",
  },
  {
    firstName: "Jessica",
    lastName: "Davis",
    headline: "UX Designer · College roommate",
    location: "Portland, Oregon, United States",
    notes:
      "College roommate for 3 years. Now a senior UX designer at a major tech company. We swap design feedback regularly.",
    timezone: "America/Los_Angeles",
  },
  {
    firstName: "Robert",
    lastName: "Taylor",
    headline: "Neighbor · Restaurant owner",
    location: "New York, United States",
    notes:
      "Neighbor for 5 years. Owns a great Italian restaurant two blocks away. Always saves a table on busy nights.",
    timezone: "America/New_York",
  },
];

function buildProfessionalDataSet(): SeedDataSet {
  return {
    contacts: PROFESSIONAL_CONTACTS,
    tags: [
      { label: "Researcher", contactIndices: [0, 1, 2, 4, 6] },
      { label: "Author", contactIndices: [3, 5, 6] },
      { label: "Speaker", contactIndices: [3, 5] },
      { label: "Mentor", contactIndices: [0, 4, 5] },
    ],
    groups: [
      { label: "Inspiration", emoji: "💡", color: "#F59F00", contactIndices: [0, 3, 5, 6] },
      { label: "Thought Leaders", emoji: "🔬", color: "#1971C2", contactIndices: [0, 1, 2, 4] },
    ],
    interactions: [
      {
        type: "Coffee",
        date: "2025-10-15",
        title: "Coffee with Alan",
        description:
          "Caught up over the latest in AI. Talked about the limits of current language models.",
        participantIndices: [1],
      },
      {
        type: "Call",
        date: "2025-11-08",
        title: "Research collaboration call",
        description: "Discussed overlapping interests between physics and network science.",
        participantIndices: [0, 2],
      },
      {
        type: "Meeting",
        date: "2025-12-03",
        title: "Year-end strategy review",
        description: "Reviewed annual goals using Peter's management frameworks.",
        participantIndices: [5, 6],
      },
      {
        type: "Note",
        date: "2026-01-20",
        title: "Book notes: Start With Why",
        description:
          "Simon's Golden Circle — WHY → HOW → WHAT. Apply this to the team's mission statement.",
        participantIndices: [3],
      },
      {
        type: "Networking event",
        date: "2026-02-18",
        title: "Tech innovation summit",
        description:
          "Panel discussion on disruptive innovation. Great talk from Clayton on sustaining vs. disruptive technologies.",
        participantIndices: [4, 6],
      },
      {
        type: "Meeting",
        date: "2026-03-10",
        title: "Leadership principles deep dive",
        description: "Deep dive into servant leadership and what it means to put people first.",
        participantIndices: [5, 3],
      },
    ],
  };
}

function buildPersonalDataSet(): SeedDataSet {
  return {
    contacts: PERSONAL_CONTACTS,
    tags: [
      { label: "Family", contactIndices: [1, 2] },
      { label: "Close friend", contactIndices: [0, 3, 4] },
      { label: "Neighbor", contactIndices: [5] },
    ],
    groups: [
      { label: "Family", emoji: "👨‍👩‍👧", color: "#2F9E44", contactIndices: [1, 2] },
      { label: "Close Friends", emoji: "❤️", color: "#E03131", contactIndices: [0, 3, 4] },
      { label: "Neighbors", emoji: "🏘️", color: "#7048E8", contactIndices: [5] },
    ],
    interactions: [
      {
        type: "Coffee",
        date: "2025-10-20",
        title: "Catch-up with Emma",
        description: "Grabbed coffee near her studio. She's training for a half marathon.",
        participantIndices: [0],
      },
      {
        type: "Call",
        date: "2025-11-15",
        title: "Weekly call with David",
        description: "He's building a new feature at work. Gave some feedback on the architecture.",
        participantIndices: [1],
      },
      {
        type: "Call",
        date: "2025-12-12",
        title: "Birthday call with Sarah",
        description: "Wished mom happy birthday. She's planning a garden expansion next spring.",
        participantIndices: [2],
      },
      {
        type: "Meal",
        date: "2026-01-12",
        title: "Lunch with Michael",
        description: "Caught up in Boston. He's working on a big museum renovation project.",
        participantIndices: [3],
      },
      {
        type: "Party/Social",
        date: "2026-02-14",
        title: "Dinner at Robert's restaurant",
        description: "Valentine's dinner. Robert cooked an amazing truffle risotto. Great evening.",
        participantIndices: [5, 4],
      },
      {
        type: "Coffee",
        date: "2026-03-05",
        title: "Design chat with Jessica",
        description:
          "She walked me through her new design system. Lots of good ideas to steal for my own projects.",
        participantIndices: [4],
      },
    ],
  };
}

function buildBothDataSet(): SeedDataSet {
  const professional = buildProfessionalDataSet();
  const personal = buildPersonalDataSet();
  const offset = professional.contacts.length;

  return {
    contacts: [...professional.contacts, ...personal.contacts],
    tags: [
      ...professional.tags,
      ...personal.tags.map((tag) => ({
        ...tag,
        contactIndices: tag.contactIndices.map((i) => i + offset),
      })),
    ],
    groups: [
      ...professional.groups,
      ...personal.groups.map((group) => ({
        ...group,
        contactIndices: group.contactIndices.map((i) => i + offset),
      })),
    ],
    interactions: [
      ...professional.interactions,
      ...personal.interactions.map((interaction) => ({
        ...interaction,
        participantIndices: interaction.participantIndices.map((i) => i + offset),
      })),
    ],
  };
}

function getDataSet(intent: NonNullable<OnboardingIntent>): SeedDataSet {
  switch (intent) {
    case "professional":
      return buildProfessionalDataSet();
    case "personal":
      return buildPersonalDataSet();
    case "both":
      return buildBothDataSet();
  }
}

/**
 * Seeds sample contacts, tags, groups, and interactions for the selected
 * onboarding intent. All requests are parallelised to minimise total time.
 * Partial failures are silently ignored so the user is not blocked.
 *
 * @param intent The selected onboarding intent.
 * @param apiUrl Base API URL (e.g. from `API_URL`).
 */
export async function seedSampleData(
  intent: NonNullable<OnboardingIntent>,
  apiUrl: string,
): Promise<void> {
  const dataSet = getDataSet(intent);

  // 1. Create all contacts in parallel.
  //    For each contact: POST to create, then PATCH metadata + PUT birthday concurrently.
  const contactResults = await Promise.allSettled(
    dataSet.contacts.map(async (contact): Promise<string> => {
      const createRes = await fetch(`${apiUrl}${API_ROUTES.CONTACTS}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: contact.firstName,
          lastName: contact.lastName,
        }),
      });

      if (!createRes.ok) return "";

      const createData = await createRes.json();
      const contactId: string = createData.data?.id ?? createData.id ?? "";
      if (!contactId) return "";

      // PATCH and birthday run concurrently — they touch independent fields.
      const patchOps: Promise<unknown>[] = [];

      if (contact.headline || contact.location || contact.notes || contact.timezone) {
        patchOps.push(
          fetch(`${apiUrl}${API_ROUTES.CONTACTS}/${contactId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(contact.headline && { headline: contact.headline }),
              ...(contact.location && { location: contact.location }),
              ...(contact.notes && { notes: contact.notes }),
              ...(contact.timezone && { timezone: contact.timezone }),
            }),
          }).catch(() => undefined),
        );
      }

      if (contact.birthday) {
        patchOps.push(
          fetch(`${apiUrl}${API_ROUTES.CONTACTS}/${contactId}/important-dates`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dates: [{ type: "birthday", date: contact.birthday, personId: contactId }],
            }),
          }).catch(() => undefined),
        );
      }

      await Promise.allSettled(patchOps);
      return contactId;
    }),
  );

  const contactIds = contactResults.map((r) => (r.status === "fulfilled" ? r.value : ""));

  // 2. Tags, groups, and interactions all run in parallel.
  await Promise.allSettled([
    // Tags: create then assign to contacts
    ...dataSet.tags.map(async (tag) => {
      const tagRes = await fetch(`${apiUrl}${API_ROUTES.TAGS}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: tag.label }),
      });

      if (!tagRes.ok) return;

      const tagData = await tagRes.json();
      const tagId: string = tagData.data?.id ?? tagData.tag?.id ?? tagData.id ?? "";
      if (!tagId) return;

      await Promise.allSettled(
        tag.contactIndices
          .map((i) => contactIds[i])
          .filter(Boolean)
          .map((cId) =>
            fetch(`${apiUrl}${API_ROUTES.CONTACTS}/${cId}/tags`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tagId }),
            }),
          ),
      );
    }),

    // Groups: create then bulk-assign contacts
    ...dataSet.groups.map(async (group) => {
      const groupRes = await fetch(`${apiUrl}${API_ROUTES.GROUPS}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: group.label,
          color: group.color,
          ...(group.emoji && { emoji: group.emoji }),
        }),
      });

      if (!groupRes.ok) return;

      const groupData = await groupRes.json();
      const groupId: string = groupData.data?.id ?? groupData.id ?? "";
      if (!groupId) return;

      const personIds = group.contactIndices.map((i) => contactIds[i]).filter(Boolean);

      if (personIds.length > 0) {
        await fetch(`${apiUrl}${API_ROUTES.GROUPS}/${groupId}/contacts`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personIds }),
        }).catch(() => undefined);
      }
    }),

    // Interactions
    ...dataSet.interactions.map((interaction) => {
      const participantIds = interaction.participantIndices
        .map((i) => contactIds[i])
        .filter(Boolean);

      return fetch(`${apiUrl}${API_ROUTES.INTERACTIONS}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: interaction.type,
          date: interaction.date,
          ...(interaction.title && { title: interaction.title }),
          ...(interaction.description && { description: interaction.description }),
          ...(participantIds.length > 0 && { participantIds }),
        }),
      }).catch(() => undefined);
    }),
  ]);
}
