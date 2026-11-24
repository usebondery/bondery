import { WEBSITE_ROUTES } from "@bondery/helpers";
import { ButtonLink } from "@bondery/mantine-next";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { Stack, Text, Title } from "@mantine/core";
import { routeAssert } from "@/lib/navigation/route/assert";
import { DocsFrame } from "./DocsFrame";

/** The 404 keeps the docs sidebar, so a stale link is one click from a real page. */
export function DocsNotFound() {
  return (
    <DocsFrame>
      <Stack gap="md">
        <Title order={1}>{docs.NotFound.Title}</Title>
        <Text>{docs.NotFound.Description}</Text>
        <ButtonLink href={routeAssert(WEBSITE_ROUTES.DOCS)}>
          {docs.NotFound.Introduction}
        </ButtonLink>
      </Stack>
    </DocsFrame>
  );
}
