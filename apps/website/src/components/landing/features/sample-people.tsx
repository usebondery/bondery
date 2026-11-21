import visuals from "@bondery/translations/locales/en/platform/website/WebsiteLandingVisuals.json" with {
  type: "json",
};
import { Avatar, type AvatarProps } from "@mantine/core";

/*
 * The demo cast for every landing page mock-up. These are the same people as the
 * hero screenshot and the repo's sample dataset (`packages/tests/sample-data`).
 * Photos are the dataset's Wikipedia portraits, copied to `public/images/sample-people/`.
 *
 * Names and photos are fixtures. Headlines and birthdays are copy, so they live in the
 * `WebsiteLandingVisuals` catalog namespace under `People`.
 *
 * Rules (see the bondery-brand skill):
 * - Use the headline verbatim. It comes from the sample dataset.
 * - Anything situational (where you met, what you last discussed, a city) may be
 *   invented, but keep it harmless and plausible. Never invent a negative claim.
 * - Never render initials. Every person in a mock has a photo.
 */
export const SAMPLE_PEOPLE = {
  ada: { name: "Ada Lovelace", photo: "/images/sample-people/ada-lovelace.jpg" },
  alan: { name: "Alan Turing", photo: "/images/sample-people/alan-turing.jpg" },
  grace: { name: "Grace Hopper", photo: "/images/sample-people/grace-hopper.jpg" },
  hedy: { name: "Hedy Lamarr", photo: "/images/sample-people/hedy-lamarr.jpg" },
  john: { name: "John von Neumann", photo: "/images/sample-people/john-von-neumann.jpg" },
  katherine: { name: "Katherine Johnson", photo: "/images/sample-people/katherine-johnson.jpg" },
  limor: { name: "Limor Fried", photo: "/images/sample-people/limor-fried.jpg" },
  margaret: { name: "Margaret Hamilton", photo: "/images/sample-people/margaret-hamilton.jpg" },
  marissa: { name: "Marissa Mayer", photo: "/images/sample-people/marissa-mayer.jpg" },
  sheryl: { name: "Sheryl Sandberg", photo: "/images/sample-people/sheryl-sandberg.jpg" },
  whitney: { name: "Whitney Wolfe Herd", photo: "/images/sample-people/whitney-wolfe-herd.jpg" },
} as const;

export type SamplePersonId = keyof typeof SAMPLE_PEOPLE;

const PEOPLE_COPY = {
  ada: visuals.People.Ada,
  alan: visuals.People.Alan,
  grace: visuals.People.Grace,
  hedy: visuals.People.Hedy,
  john: visuals.People.John,
  katherine: visuals.People.Katherine,
  limor: visuals.People.Limor,
  margaret: visuals.People.Margaret,
  marissa: visuals.People.Marissa,
  sheryl: visuals.People.Sheryl,
  whitney: visuals.People.Whitney,
} as const satisfies Record<SamplePersonId, { Headline: string }>;

/** One-line description of a sample person, shown under the name in a mock. */
export function personHeadline(id: SamplePersonId): string {
  return PEOPLE_COPY[id].Headline;
}

/** Birthday of a sample person who has one in the demo. */
export function personBirthday(id: "ada" | "alan"): string {
  return PEOPLE_COPY[id].Birthday;
}

type PersonAvatarProps = Omit<AvatarProps, "name" | "src"> & { person: SamplePersonId };

/**
 * A circular photo avatar for a sample person.
 */
export function PersonAvatar({ person, ...avatarProps }: PersonAvatarProps) {
  const { name, photo } = SAMPLE_PEOPLE[person];

  return <Avatar alt={name} name={name} radius="xl" src={photo} {...avatarProps} />;
}
