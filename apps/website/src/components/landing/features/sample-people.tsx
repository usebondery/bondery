import { Avatar, type AvatarProps } from "@mantine/core";

/*
 * The demo cast for every landing page mock-up. These are the same people as the
 * hero screenshot and the repo's sample dataset (`packages/tests/sample-data`).
 * Photos are the dataset's Wikipedia portraits, copied to `public/images/sample-people/`.
 *
 * Rules (see the bondery-brand skill):
 * - Use `headline` verbatim. It comes from the sample dataset.
 * - Anything situational (where you met, what you last discussed, a city) may be
 *   invented, but keep it harmless and plausible. Never invent a negative claim.
 * - Never render initials. Every person in a mock has a photo.
 */
export const SAMPLE_PEOPLE = {
  ada: {
    birthday: "December 10",
    headline: "Mathematician",
    name: "Ada Lovelace",
    photo: "/images/sample-people/ada-lovelace.jpg",
  },
  alan: {
    birthday: "June 23",
    headline: "Computer scientist",
    name: "Alan Turing",
    photo: "/images/sample-people/alan-turing.jpg",
  },
  grace: {
    headline: "Rear Admiral, US Navy",
    name: "Grace Hopper",
    photo: "/images/sample-people/grace-hopper.jpg",
  },
  hedy: {
    headline: "Inventor and actor",
    name: "Hedy Lamarr",
    photo: "/images/sample-people/hedy-lamarr.jpg",
  },
  john: {
    headline: "Mathematician",
    name: "John von Neumann",
    photo: "/images/sample-people/john-von-neumann.jpg",
  },
  katherine: {
    headline: "Mathematician, NASA",
    name: "Katherine Johnson",
    photo: "/images/sample-people/katherine-johnson.jpg",
  },
  limor: {
    headline: "Founder, Adafruit",
    name: "Limor Fried",
    photo: "/images/sample-people/limor-fried.jpg",
  },
  margaret: {
    headline: "Software engineer, Apollo",
    name: "Margaret Hamilton",
    photo: "/images/sample-people/margaret-hamilton.jpg",
  },
  marissa: {
    headline: "Former CEO, Yahoo",
    name: "Marissa Mayer",
    photo: "/images/sample-people/marissa-mayer.jpg",
  },
  sheryl: {
    headline: "Operator and author",
    name: "Sheryl Sandberg",
    photo: "/images/sample-people/sheryl-sandberg.jpg",
  },
  whitney: {
    headline: "Founder, Bumble",
    name: "Whitney Wolfe Herd",
    photo: "/images/sample-people/whitney-wolfe-herd.jpg",
  },
} as const;

export type SamplePersonId = keyof typeof SAMPLE_PEOPLE;

type PersonAvatarProps = Omit<AvatarProps, "name" | "src"> & { person: SamplePersonId };

/**
 * A circular photo avatar for a sample person.
 */
export function PersonAvatar({ person, ...avatarProps }: PersonAvatarProps) {
  const { name, photo } = SAMPLE_PEOPLE[person];

  return <Avatar alt={name} name={name} radius="xl" src={photo} {...avatarProps} />;
}
