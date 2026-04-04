"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Group, Loader, Stack, Text } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { createSpotlight, Spotlight } from "@mantine/spotlight";
import { IconBriefcase, IconCompass, IconSearch, IconUsers } from "@tabler/icons-react";
import type { Contact } from "@bondery/types";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { getAvatarColorFromName } from "@/lib/avatarColor";
import { searchContacts } from "@/lib/searchContacts";
import { HOTKEYS } from "@/lib/config";

const [peopleStore, peopleSearchActions] = createSpotlight();
export { peopleSearchActions };

const descriptionColor = "var(--action-description-color, var(--mantine-color-dimmed))";

const MIN_QUERY_LENGTH = 3;

export function PeopleSearchSpotlight() {
  const router = useRouter();
  const [results, setResults] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const latestRequestRef = useRef(0);

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    const contacts = await searchContacts(q);
    if (requestId === latestRequestRef.current) {
      setResults(contacts);
      setIsLoading(false);
    }
  }, 300);

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length >= MIN_QUERY_LENGTH) {
        debouncedSearch(q.trim());
      } else {
        setResults([]);
        setIsLoading(false);
      }
    },
    [debouncedSearch],
  );

  function handleClose() {
    setQuery("");
    setResults([]);
    setIsLoading(false);
  }

  function handlePersonClick(contact: Contact) {
    router.push(`${WEBAPP_ROUTES.PERSON}/${contact.id}`);
  }

  function handleSeeAll() {
    router.push(`${WEBAPP_ROUTES.PEOPLE}?q=${encodeURIComponent(query.trim())}`);
  }

  const trimmed = query.trim();
  const belowMinLength = trimmed.length < MIN_QUERY_LENGTH;

  return (
    <Spotlight.Root
      store={peopleStore}
      query={query}
      onQueryChange={handleQueryChange}
      clearQueryOnClose
      shortcut={HOTKEYS.FIND_PERSON}
      scrollable
      maxHeight={400}
      onSpotlightClose={handleClose}
    >
      <Spotlight.Search
        leftSection={<IconSearch size={18} stroke={1.5} />}
        placeholder="Search people by name…"
      />

      <Spotlight.ActionsList>
        {belowMinLength && !isLoading && (
          <Spotlight.Empty>Type at least 3 characters to search</Spotlight.Empty>
        )}

        {!belowMinLength && isLoading && (
          <Spotlight.Empty>
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          </Spotlight.Empty>
        )}

        {!belowMinLength && !isLoading && results.length === 0 && (
          <Spotlight.Empty>No people found</Spotlight.Empty>
        )}

        {!belowMinLength &&
          !isLoading &&
          results.map((contact) => {
            const fullName = [contact.firstName, contact.middleName, contact.lastName]
              .filter(Boolean)
              .join(" ");

            return (
              <Spotlight.Action key={contact.id} onClick={() => handlePersonClick(contact)}>
                <Group gap="sm" wrap="nowrap" align="center" w="100%">
                  <Avatar
                    src={contact.avatar || undefined}
                    size={32}
                    radius="xl"
                    color={getAvatarColorFromName(contact.firstName, contact.lastName)}
                    name={fullName}
                  />
                  <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" fw={600} truncate>
                      {fullName}
                    </Text>
                    {contact.headline && (
                      <Group gap={4} wrap="nowrap" style={{ minWidth: 0, color: descriptionColor }}>
                        <IconBriefcase size={12} stroke={1.5} style={{ flexShrink: 0 }} />
                        <Text size="xs" truncate c="inherit">
                          {contact.headline}
                        </Text>
                      </Group>
                    )}
                    {contact.location && (
                      <Group gap={4} wrap="nowrap" style={{ minWidth: 0, color: descriptionColor }}>
                        <IconCompass size={12} stroke={1.5} style={{ flexShrink: 0 }} />
                        <Text size="xs" truncate c="inherit">
                          {contact.location}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                </Group>
              </Spotlight.Action>
            );
          })}

        {!belowMinLength && !isLoading && results.length > 0 && (
          <Spotlight.Action onClick={handleSeeAll}>
            <Group gap="xs" justify="center" style={{ color: descriptionColor }}>
              <IconUsers size={16} stroke={1.5} />
              <Text size="sm" c="inherit">
                See all results in People
              </Text>
            </Group>
          </Spotlight.Action>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
}
