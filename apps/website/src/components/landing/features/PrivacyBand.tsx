import { SOCIAL_LINKS } from "@bondery/helpers";
import { ButtonLink, hrefAssert } from "@bondery/mantine-next";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { Card, List, ListItem, Text, ThemeIcon } from "@mantine/core";
import { IconBook, IconBrandGithub, IconCheck } from "@tabler/icons-react";
import { LockVisual } from "./lock3d/LockVisual";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./SectionHeader";

const SELF_HOSTING_DOCS_HREF = "/docs/deploy/requirements";

/** Three points at most. More than that stops being scannable. */
const PRIVACY_POINTS = [
  landing.PrivacyBand.Points.OpenSource,
  landing.PrivacyBand.Points.EuHosted,
  landing.PrivacyBand.Points.SelfHostOrExport,
] as const;

/**
 * Privacy and ownership promise, with links to the source code and the self-hosting guide.
 */
export function PrivacyBand() {
  return (
    <Reveal>
      <Card
        padding={0}
        radius="lg"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
        }}
        withBorder
      >
        <div className="grid grid-cols-1 items-center gap-10 p-6 md:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
          <div className="flex flex-col gap-8">
            <SectionHeader align="left" title={landing.PrivacyBand.Title} />

            <List
              center
              icon={
                <ThemeIcon color="teal" radius="xl" size={22} variant="light">
                  <IconCheck size={14} stroke={2.5} />
                </ThemeIcon>
              }
              spacing="sm"
            >
              {PRIVACY_POINTS.map((point) => (
                <ListItem key={point}>
                  <Text size="md">{point}</Text>
                </ListItem>
              ))}
            </List>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href={SOCIAL_LINKS.github}
                leftSection={<IconBrandGithub size={18} />}
                rel="noopener noreferrer"
                size="md"
                target="_blank"
                variant="default"
              >
                {landing.PrivacyBand.ViewOnGitHub}
              </ButtonLink>
              <ButtonLink
                color="gray"
                href={hrefAssert(SELF_HOSTING_DOCS_HREF)}
                leftSection={<IconBook size={18} />}
                size="md"
                variant="subtle"
              >
                {landing.PrivacyBand.SelfHostingGuide}
              </ButtonLink>
            </div>
          </div>

          <div className="flex justify-center">
            <LockVisual />
          </div>
        </div>
      </Card>
    </Reveal>
  );
}
