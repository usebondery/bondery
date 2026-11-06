"use client";

import { Kbd } from "@bondery/mantine-next";
import { Group, Loader, Text } from "@mantine/core";
import { useDebouncedCallback, useHotkeys } from "@mantine/hooks";
import { Spotlight, spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { type DocsSearchResult, toSearchGroups } from "@/lib/docs-search";
import { routeAssert } from "@/lib/navigation/route/assert";

const RESULT_LIMIT = 24;

/** The search API already ranked these hits. Do not filter them by the query again. */
function keepServerResults<T>(_query: string, actions: readonly T[]): readonly T[] {
  return actions;
}

function isDocsSearchResult(value: unknown): value is DocsSearchResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const type = record.type;
  const breadcrumbs = record.breadcrumbs;
  const breadcrumbsOk =
    breadcrumbs === undefined ||
    (Array.isArray(breadcrumbs) && breadcrumbs.every((item) => typeof item === "string"));

  return (
    typeof record.id === "string" &&
    typeof record.url === "string" &&
    typeof record.content === "string" &&
    (type === "page" || type === "heading" || type === "text") &&
    breadcrumbsOk
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
  );
}

export function DocsSearchSpotlight() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DocsSearchResult[]>([]);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const search = useDebouncedCallback((term: string) => {
    const trimmed = term.trim();
    abortRef.current?.abort();

    if (trimmed.length === 0) {
      setLoading(false);
      setResults([]);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const id = requestId.current + 1;
    requestId.current = id;
    setResults([]);
    setLoading(true);

    void fetch(`/api/search?query=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Search failed");
        }

        const body: unknown = await response.json();
        if (requestId.current !== id) {
          return;
        }

        if (!Array.isArray(body)) {
          setResults([]);
          return;
        }

        setResults(body.filter(isDocsSearchResult));
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || requestId.current !== id) {
          return;
        }

        setResults([]);
      })
      .finally(() => {
        if (requestId.current === id) {
          setLoading(false);
        }
      });
  }, 200);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (next.trim().length === 0) {
      search.cancel();
      abortRef.current?.abort();
      requestId.current += 1;
      setLoading(false);
      setResults([]);
      return;
    }

    search(next);
  }

  useHotkeys([["/", () => spotlight.open()]]);

  const groups = keepServerResults(query, toSearchGroups(results.slice(0, RESULT_LIMIT)));
  const trimmedQuery = query.trim();
  const showLoader = loading && groups.length === 0;
  const showEmpty = !loading && groups.length === 0 && trimmedQuery.length > 0;

  return (
    <Spotlight.Root
      maxHeight={420}
      onQueryChange={handleQueryChange}
      query={query}
      scrollable
      shortcut="mod + K"
    >
      <Spotlight.Search
        aria-label="Search documentation"
        leftSection={<IconSearch size={18} stroke={1.5} />}
        placeholder="Search docs"
      />
      {showLoader ? (
        <Spotlight.Empty>
          <Loader size="sm" />
        </Spotlight.Empty>
      ) : null}
      {showEmpty ? (
        <Spotlight.Empty>
          <Text size="sm">No results for "{query}".</Text>
        </Spotlight.Empty>
      ) : null}
      {groups.length > 0 ? (
        <Spotlight.ActionsList>
          {groups.map((group) => (
            <Spotlight.ActionsGroup key={group.group} label={group.group}>
              {group.actions.map((action) => (
                <Spotlight.Action
                  description={action.description}
                  highlightQuery
                  key={action.id}
                  label={action.label}
                  onClick={() => {
                    router.push(routeAssert(action.url));
                  }}
                />
              ))}
            </Spotlight.ActionsGroup>
          ))}
        </Spotlight.ActionsList>
      ) : null}
      <Spotlight.Footer>
        <Group gap="md" justify="space-between">
          <Group gap={6}>
            <Kbd keys={["up"]} size="xs" />
            <Kbd keys={["down"]} size="xs" />
            <Text c="dimmed" size="xs">
              Navigate
            </Text>
          </Group>
          <Group gap={6}>
            <Kbd keys={["enter"]} size="xs" />
            <Text c="dimmed" size="xs">
              Open
            </Text>
          </Group>
          <Group gap={6}>
            <Kbd keys={["esc"]} size="xs" />
            <Text c="dimmed" size="xs">
              Close
            </Text>
          </Group>
        </Group>
      </Spotlight.Footer>
    </Spotlight.Root>
  );
}
