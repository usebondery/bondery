import { AnchorLink } from "@bondery/mantine-next";
import { List, ListItem, Stack, Text, Title } from "@mantine/core";
import { routeAssert } from "@/lib/navigation/route/assert";
import { STORE_SHOT_COPY } from "./_lib/copy";
import { STORE_SHOT_SLUGS } from "./_lib/slugs";

export default function StoreShotsIndexPage() {
  return (
    <Stack gap="md" maw={640} p="xl">
      <Title order={1}>Store shots</Title>
      <Text c="dimmed" size="sm">
        Local Chrome Web Store listing compositions. Production returns 404.
      </Text>
      <List spacing="sm" type="ordered">
        {STORE_SHOT_SLUGS.map((slug) => (
          <ListItem key={slug}>
            <AnchorLink href={routeAssert(`/dev/store-shots/${slug}`)}>
              {STORE_SHOT_COPY[slug].headline}
            </AnchorLink>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
