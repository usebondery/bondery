import type {
  Activity,
  ContactPreview,
  GroupWithCount,
  InteractionParticipant,
} from "@bondery/schemas";
import type { PeopleMapMarker } from "@/components/map/PeopleMap";

/** Public copies of `packages/tests` sample avatars — tsc and docker prune cannot import those JPEGs. */
function sampleAvatar(id: string): string {
  return `/dev/store-shots/${id}.jpg`;
}

/** PersonCard/PersonChip identity used by listing shots. */
export type StoreShotPerson = ContactPreview & {
  headline: string | null;
  location: string | null;
  middleName: string | null;
};

const FIXTURE_USER_ID = "00000000-0000-4000-8000-000000000099";
const FIXTURE_STAMP = "2026-06-01T08:00:00.000Z";

/**
 * Repository sample contacts and their bundled sample avatars.
 */
export const ADA_LOVELACE: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-202a-71ec-bf4b-8b611c9e64eb"),
  firstName: "Ada",
  headline: "Mathematician",
  id: "01a03e59-202a-71ec-bf4b-8b611c9e64eb",
  lastName: "Lovelace",
  location: "London",
  middleName: null,
};

export const ALAN_TURING: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-2220-758f-94fb-4e1a73f30d58"),
  firstName: "Alan",
  headline: "Computer scientist",
  id: "01a03e59-2220-758f-94fb-4e1a73f30d58",
  lastName: "Turing",
  location: "Manchester",
  middleName: null,
};

export const GRACE_HOPPER: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-2521-766e-ab8d-085f2dd423aa"),
  firstName: "Grace",
  headline: "Rear Admiral, US Navy",
  id: "01a03e59-2521-766e-ab8d-085f2dd423aa",
  lastName: "Hopper",
  location: "Arlington, Texas",
  middleName: null,
};

export const MARGARET_HAMILTON: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-26b6-71df-97bc-79150869a6c0"),
  firstName: "Margaret",
  headline: "Software engineer, Apollo",
  id: "01a03e59-26b6-71df-97bc-79150869a6c0",
  lastName: "Hamilton",
  location: "Cambridge",
  middleName: null,
};

export const KATHERINE_JOHNSON: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-40a2-70c1-8820-fec892f6f28e"),
  firstName: "Katherine",
  headline: "Mathematician, NASA",
  id: "01a03e59-40a2-70c1-8820-fec892f6f28e",
  lastName: "Johnson",
  location: "Hampton",
  middleName: null,
};

export const HEDY_LAMARR: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-43bd-70bf-b678-1673878f566f"),
  firstName: "Hedy",
  headline: "Inventor and actor",
  id: "01a03e59-43bd-70bf-b678-1673878f566f",
  lastName: "Lamarr",
  location: "Vienna",
  middleName: null,
};

const STEVE_JOBS: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-23b1-727e-bd0b-e30edda99894"),
  firstName: "Steve",
  headline: "Co-founder, Apple",
  id: "01a03e59-23b1-727e-bd0b-e30edda99894",
  lastName: "Jobs",
  location: "California",
  middleName: null,
};

const BILL_GATES: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-2a6f-747f-9971-8d05fb465777"),
  firstName: "Bill",
  headline: "Co-founder, Microsoft",
  id: "01a03e59-2a6f-747f-9971-8d05fb465777",
  lastName: "Gates",
  location: "Washington",
  middleName: null,
};

const LARRY_PAGE: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-551d-700c-91aa-1087d4d77e3a"),
  firstName: "Larry",
  headline: "Co-founder, Google",
  id: "01a03e59-551d-700c-91aa-1087d4d77e3a",
  lastName: "Page",
  location: "California",
  middleName: null,
};

const SERGEY_BRIN: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-5676-705d-9579-85b5c52fdcec"),
  firstName: "Sergey",
  headline: "Co-founder, Google",
  id: "01a03e59-5676-705d-9579-85b5c52fdcec",
  lastName: "Brin",
  location: "California",
  middleName: null,
};

const JEFF_BEZOS: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-58f4-7567-afbb-3c1869e200a6"),
  firstName: "Jeff",
  headline: "Founder, Amazon",
  id: "01a03e59-58f4-7567-afbb-3c1869e200a6",
  lastName: "Bezos",
  location: "Washington",
  middleName: null,
};

const RESHMA_SAUJANI: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-8462-734d-b091-973badd33e49"),
  firstName: "Reshma",
  headline: "Founder, Girls Who Code",
  id: "01a03e59-8462-734d-b091-973badd33e49",
  lastName: "Saujani",
  location: "New York",
  middleName: null,
};

const LIMOR_FRIED: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-8705-72d4-af68-f58bcca40b93"),
  firstName: "Limor",
  headline: "Founder, Adafruit",
  id: "01a03e59-8705-72d4-af68-f58bcca40b93",
  lastName: "Fried",
  location: "New York",
  middleName: null,
};

const TIM_BERNERS_LEE: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-2fc8-728b-a417-0e171d3a4529"),
  firstName: "Tim",
  headline: "Inventor of the World Wide Web",
  id: "01a03e59-2fc8-728b-a417-0e171d3a4529",
  lastName: "Berners-Lee",
  location: "Oxford",
  middleName: null,
};

const VINT_CERF: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-336d-74fd-bbc2-2d62b9698ed4"),
  firstName: "Vint",
  headline: "Internet pioneer",
  id: "01a03e59-336d-74fd-bbc2-2d62b9698ed4",
  lastName: "Cerf",
  location: "Virginia",
  middleName: null,
};

const RADIA_PERLMAN: StoreShotPerson = {
  avatar: sampleAvatar("01a03e59-3644-725b-b0ec-cc80e698509a"),
  firstName: "Radia",
  headline: "Network engineer",
  id: "01a03e59-3644-725b-b0ec-cc80e698509a",
  lastName: "Perlman",
  location: "Washington",
  middleName: null,
};

function participant(person: StoreShotPerson): InteractionParticipant {
  return {
    avatar: person.avatar,
    firstName: person.firstName,
    headline: person.headline,
    id: person.id,
    lastName: person.lastName,
    location: person.location,
    middleName: person.middleName,
  };
}

function activity(input: {
  date: string;
  description: string;
  id: string;
  participants: StoreShotPerson[];
  title: string;
  type: Activity["type"];
}): Activity {
  return {
    createdAt: FIXTURE_STAMP,
    date: input.date,
    description: input.description,
    id: input.id,
    participants: input.participants.map(participant),
    title: input.title,
    type: input.type,
    updatedAt: FIXTURE_STAMP,
    userId: FIXTURE_USER_ID,
  };
}

/** Three sample-contact interactions for the remember shot timeline. */
export const STORE_SHOT_ACTIVITIES: Activity[] = [
  activity({
    date: "2026-06-20T16:00:00.000Z",
    description: "Five founders, one stage, and a lot of ambitious demos.",
    id: "00000000-0000-4000-8000-000000000011",
    participants: [STEVE_JOBS, BILL_GATES, LARRY_PAGE, SERGEY_BRIN, JEFF_BEZOS],
    title: "YC Demo Day group call",
    type: "Call",
  }),
  activity({
    date: "2026-06-12T12:00:00.000Z",
    description: "Caught up on the next Girls Who Code cohort.",
    id: "00000000-0000-4000-8000-000000000012",
    participants: [RESHMA_SAUJANI],
    title: "Coffee with Reshma",
    type: "Coffee",
  }),
  activity({
    date: "2026-06-04T17:30:00.000Z",
    description: "Talked about open hardware and community.",
    id: "00000000-0000-4000-8000-000000000013",
    participants: [LIMOR_FRIED],
    title: "Lunch with Limor",
    type: "Meeting",
  }),
];

export const STORE_SHOT_TAGS: Array<{ color: string; label: string }> = [
  { color: "#228be6", label: "#friends" },
  { color: "#fd7e14", label: "#ux" },
  { color: "#7c3aed", label: "#software" },
  { color: "#12b886", label: "#cycling" },
  { color: "#e64980", label: "#founders" },
  { color: "#2f9e44", label: "#golf" },
];

export const CLASS_OF_2027_GROUP: GroupWithCount = {
  color: "#D0EBFF",
  contactCount: 50,
  createdAt: FIXTURE_STAMP,
  emoji: "🎓",
  id: "00000000-0000-4000-8000-000000000021",
  label: "Class of 2027",
  previewContacts: [TIM_BERNERS_LEE, VINT_CERF, RADIA_PERLMAN],
  updatedAt: FIXTURE_STAMP,
  userId: FIXTURE_USER_ID,
};

export const YC_GROUP: GroupWithCount = {
  color: "#FFE8CC",
  contactCount: 12,
  createdAt: FIXTURE_STAMP,
  emoji: "🚀",
  id: "00000000-0000-4000-8000-000000000022",
  label: "YC",
  previewContacts: [RADIA_PERLMAN, TIM_BERNERS_LEE, VINT_CERF],
  updatedAt: FIXTURE_STAMP,
  userId: FIXTURE_USER_ID,
};

export const CYCLING_GROUP: GroupWithCount = {
  color: "#D3F9D8",
  contactCount: 24,
  createdAt: FIXTURE_STAMP,
  emoji: "🚲",
  id: "00000000-0000-4000-8000-000000000023",
  label: "Cycling club",
  previewContacts: [VINT_CERF, RADIA_PERLMAN, TIM_BERNERS_LEE],
  updatedAt: FIXTURE_STAMP,
  userId: FIXTURE_USER_ID,
};

/** Central Europe — Prague area for store-shot map framing. */
export const STORE_SHOT_MAP_CENTER: [number, number] = [50.5, 10.5];

export const STORE_SHOT_MAP_MARKERS: PeopleMapMarker[] = [
  {
    avatarUrl: ADA_LOVELACE.avatar,
    firstName: ADA_LOVELACE.firstName,
    id: ADA_LOVELACE.id,
    lastName: ADA_LOVELACE.lastName,
    latitude: 51.50745,
    longitude: -0.12777,
    name: "Ada Lovelace",
  },
  {
    avatarUrl: ALAN_TURING.avatar,
    firstName: ALAN_TURING.firstName,
    id: ALAN_TURING.id,
    lastName: ALAN_TURING.lastName,
    latitude: 53.47949,
    longitude: -2.24511,
    name: "Alan Turing",
  },
  {
    avatarUrl: HEDY_LAMARR.avatar,
    firstName: HEDY_LAMARR.firstName,
    id: HEDY_LAMARR.id,
    lastName: HEDY_LAMARR.lastName,
    latitude: 48.20835,
    longitude: 16.3725,
    name: "Hedy Lamarr",
  },
  {
    avatarUrl: GRACE_HOPPER.avatar,
    firstName: GRACE_HOPPER.firstName,
    id: GRACE_HOPPER.id,
    lastName: GRACE_HOPPER.lastName,
    latitude: 50.08747,
    longitude: 14.42125,
    name: "Grace Hopper",
  },
];
