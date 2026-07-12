"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactSelectable } from "@bondery/schemas";
import { Avatar, Group, Loader, Stack, Text } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { createSpotlight, Spotlight } from "@mantine/spotlight";
import { IconBriefcase, IconCompass, IconSearch, IconUsers } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { getAvatarColorFromName } from "@/lib/contacts/avatarColor";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { usePeopleSearchSpotlightTranslations } from "@/lib/i18n/generated/hooks";
import { optimisticPersonDocumentTitle } from "@/lib/metadata/optimisticTitles";
import { useNavigateWithTitle } from "@/lib/metadata/useNavigateWithTitle";
import { DEBOUNCE_MS, HOTKEYS } from "@/lib/platform/config";

const [peopleStore, peopleSearchActions] = createSpotlight();

export { peopleSearchActions };

const descriptionColor = "var(--action-description-color, var(--mantine-color-dimmed))";

const MIN_QUERY_LENGTH = 3;

export function PeopleSearchSpotlight() {
  const t = usePeopleSearchSpotlightTranslations();
  const { navigateWithTitle } = useNavigateWithTitle();
  const router = useRouter();
  const [results, setResults] = useState<ContactSelectable[]>([]);
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
  }, DEBOUNCE_MS.search);

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length >= MIN_QUERY_LENGTH) {
        // Show the loader immediately so the user sees intent before the
        // debounce fires and the actual fetch begins.
        setIsLoading(true);
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

  function handlePersonClick(contact: ContactSelectable) {
    navigateWithTitle(
      `${WEBAPP_ROUTES.PERSON}/${contact.id}`,
      optimisticPersonDocumentTitle(contact),
    );
  }

  function handleSeeAll() {
    router.push(`${WEBAPP_ROUTES.PEOPLE}?search=${encodeURIComponent(query.trim())}`);
  }

  const trimmed = query.trim();
  const belowMinLength = trimmed.length < MIN_QUERY_LENGTH;

  return (
    <Spotlight.Root
      clearQueryOnClose
      maxHeight={400}
      onQueryChange={handleQueryChange}
      onSpotlightClose={handleClose}
      query={query}
      scrollable
      shortcut={HOTKEYS.FIND_PERSON}
      store={peopleStore}
    >
      <Spotlight.Search
        leftSection={<IconSearch size={18} stroke={1.5} />}
        placeholder={t("SearchPlaceholder")}
      />

      <Spotlight.ActionsList>
        {belowMinLength && !isLoading && <Spotlight.Empty>{t("TypeMinChars")}</Spotlight.Empty>}

        {!belowMinLength && isLoading && (
          <Spotlight.Empty>
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          </Spotlight.Empty>
        )}

        {!belowMinLength && !isLoading && results.length === 0 && (
          <Spotlight.Empty>{t("NoPeopleFound")}</Spotlight.Empty>
        )}

        {!belowMinLength &&
          !isLoading &&
          results.map((contact) => {
            const fullName = [contact.firstName, contact.middleName, contact.lastName]
              .filter(Boolean)
              .join(" ");

            return (
              <Spotlight.Action key={contact.id} onClick={() => handlePersonClick(contact)}>
                <Group align="center" gap="sm" w="100%" wrap="nowrap">
                  <Avatar
                    color={getAvatarColorFromName(contact.firstName, contact.lastName)}
                    name={fullName}
                    radius="xl"
                    size={32}
                    src={contact.avatar || undefined}
                  />
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate>
                      {fullName}
                    </Text>
                    {contact.headline && (
                      <Group gap={4} style={{ color: descriptionColor, minWidth: 0 }} wrap="nowrap">
                        <IconBriefcase size={12} stroke={1.5} style={{ flexShrink: 0 }} />
                        <Text c="inherit" size="xs" truncate>
                          {contact.headline}
                        </Text>
                      </Group>
                    )}
                    {contact.location && (
                      <Group gap={4} style={{ color: descriptionColor, minWidth: 0 }} wrap="nowrap">
                        <IconCompass size={12} stroke={1.5} style={{ flexShrink: 0 }} />
                        <Text c="inherit" size="xs" truncate>
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
              <Text c="inherit" size="sm">
                {t("SeeAllResults")}
              </Text>
            </Group>
          </Spotlight.Action>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
}
