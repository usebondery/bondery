"use client";

import { Button, Center, Group, Loader, Text, UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { resolveLoadMoreBranch } from "./resolveLoadMoreBranch";
import { useShellScrollViewport } from "./ShellScrollViewportContext";
import { shouldRequestNextPage } from "./shouldRequestNextPage";

/** Fetch the next page before the sentinel is 240px below the shell viewport. */
const ROOT_MARGIN = "0px 0px 240px 0px";

export type ShellScrollLoadMoreProps = {
  errorLabel: string;
  fallbackLabel: string;
  hasMore: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  retryLabel: string;
};

/**
 * Observes one sentinel against the shell viewport.
 * When that viewport is missing, shows the explicit load button and does not observe `window`.
 */
export function ShellScrollLoadMore({
  errorLabel,
  fallbackLabel,
  hasMore,
  isFetchNextPageError,
  isFetchingNextPage,
  onLoadMore,
  retryLabel,
}: ShellScrollLoadMoreProps) {
  const tA11y = useCommonTranslations("a11y");
  const viewport = useShellScrollViewport();
  const targetRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  /**
   * The shell viewport lives in client state, so the server always sees `null`.
   * A streamed boundary can hydrate after that state is set, which would make
   * the client pick a different branch than the server HTML. Gate the fallback
   * on mount so the hydration render matches the server in both cases.
   */
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const root = viewport;
    const target = targetRef.current;
    if (!root || !target || isFetchNextPageError) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);
        if (
          shouldRequestNextPage(hasMore, isFetchingNextPage, isFetchNextPageError, isIntersecting)
        ) {
          onLoadMoreRef.current();
        }
      },
      { root, rootMargin: ROOT_MARGIN },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isFetchNextPageError, isFetchingNextPage, viewport]);

  const branch = resolveLoadMoreBranch({
    hasMore,
    hasMounted,
    hasViewport: viewport !== null,
    isFetchingNextPage,
    isFetchNextPageError,
  });

  if (branch === "error") {
    return (
      <Group gap="xs" justify="center" wrap="nowrap">
        <Text size="sm">{errorLabel}</Text>
        <UnstyledButton onClick={onLoadMore} type="button">
          <Text size="sm" td="underline">
            {retryLabel}
          </Text>
        </UnstyledButton>
      </Group>
    );
  }

  if (branch === "none") {
    return null;
  }

  if (branch === "fallback") {
    return (
      <Center>
        <Button loading={isFetchingNextPage} onClick={onLoadMore} variant="light">
          {fallbackLabel}
        </Button>
      </Center>
    );
  }

  return (
    <div>
      {isFetchingNextPage ? (
        <Center>
          <Loader aria-label={tA11y("loadingMore")} size="sm" />
        </Center>
      ) : null}
      {hasMore ? <div aria-hidden ref={targetRef} style={{ height: 1 }} /> : null}
    </div>
  );
}
