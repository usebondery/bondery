"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { PERSON_SEARCH_OPTION_HIT_CLASS, PersonSearchOptionRow } from "@bondery/mantine-next";
import type { ContactSelectable } from "@bondery/schemas";
import { Group, Loader, Text } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { createSpotlight, Spotlight } from "@mantine/spotlight";
import { IconSearch, IconUsers } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { usePeopleSearchSpotlightTranslations } from "@/lib/i18n/generated/hooks";
import { optimisticPersonDocumentTitle } from "@/lib/metadata/optimisticTitles";
import { useNavigateWithTitle } from "@/lib/metadata/useNavigateWithTitle";
import { DEBOUNCE_MS, HOTKEYS } from "@/lib/platform/config";

const [peopleStore, peopleSearchActions] = createSpotlight();

export { peopleSearchActions };

const descriptionColor = "var(--action-description-color, var(--mantine-color-dimmed))";

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
      const trimmedQuery = q.trim();
      if (trimmedQuery.length > 0) {
        // Show the loader immediately so the user sees intent before the
        // debounce fires and the actual fetch begins.
        setIsLoading(true);
        debouncedSearch(trimmedQuery);
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
  const hasQuery = trimmed.length > 0;

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
        {hasQuery && isLoading && (
          <Spotlight.Empty>
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          </Spotlight.Empty>
        )}

        {hasQuery && !isLoading && results.length === 0 && (
          <Spotlight.Empty>{t("NoPeopleFound")}</Spotlight.Empty>
        )}

        {hasQuery &&
          !isLoading &&
          results.map((contact) => (
            <Spotlight.Action
              className={PERSON_SEARCH_OPTION_HIT_CLASS}
              key={contact.id}
              onClick={() => handlePersonClick(contact)}
            >
              <PersonSearchOptionRow person={contact} />
            </Spotlight.Action>
          ))}

        {hasQuery && !isLoading && results.length > 0 && (
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
