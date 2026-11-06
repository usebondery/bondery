import { WEBSITE_ROUTES } from "@bondery/helpers";
import { ButtonLink } from "@bondery/mantine-next";
import { Stack, Text, Title } from "@mantine/core";
import { routeAssert } from "@/lib/navigation/route/assert";
import { DocsFrame } from "./DocsFrame";

/** The 404 keeps the docs sidebar, so a stale link is one click from a real page. */
export function DocsNotFound() {
  return (
    <DocsFrame>
      <Stack gap="md">
        <Title order={1}>This page is not here</Title>
        <Text>The link may be old. Search the docs, or start from the introduction.</Text>
        <ButtonLink href={routeAssert(WEBSITE_ROUTES.DOCS)}>Introduction</ButtonLink>
      </Stack>
    </DocsFrame>
  );
}
