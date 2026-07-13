import { Stack } from "@mantine/core";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { PageWrapper } from "@/components/shell/PageWrapper";
import type { ColumnKey } from "@/lib/contacts/table-types";
import { COLUMN_VISIBILITY_COOKIE } from "@/lib/cookies/constants";
import { getPeoplePageTranslations } from "@/lib/i18n/generated/hooks.server";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { parseContactsListParams } from "@/lib/query/contactsListParams";
import { PeopleHeaderClient } from "./components/chrome/PeopleHeaderClient";
import { PeopleTableSkeleton } from "./components/chrome/PeopleSkeletons";
import { PeopleTableLoader } from "./components/chrome/PeopleTableLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getPeoplePageTranslations();
  return staticPageTitle(t("Title"));
}

/** Matches DEFAULT_COLUMNS in PeopleClient - used to derive the skeleton shape. */
const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "name",
  "headline",
  "location",
  "lastInteraction",
  "social",
];

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; sort?: string }>;
}) {
  // Await only the fast parts - params and cookies. The contacts DB query is
  // deferred to PeopleTableLoader so this component returns JSX immediately
  // and the header renders before data arrives.
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);

  const filter = parseContactsListParams({
    search: params.search,
    sort: params.sort,
  });

  // Read column visibility preferences from cookie so the streamed PeopleClient
  // initialises with the correct columns - no client-side layout shift.
  const raw = cookieStore.get(COLUMN_VISIBILITY_COOKIE)?.value;
  let savedColumnVisibility: { key: string; visible: boolean }[] | undefined;
  try {
    if (raw) {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed)) {
        savedColumnVisibility = parsed as { key: string; visible: boolean }[];
      }
    }
  } catch {
    // Malformed cookie - fall back to defaults
  }

  // Derive visible column keys so the skeleton column shapes exactly match
  // what the real table will render - name shows PersonChip, social shows
  // icon row, etc.
  const visibleColumns: ColumnKey[] = savedColumnVisibility
    ? DEFAULT_VISIBLE_COLUMNS.filter((key) => {
        const saved = savedColumnVisibility.find((s) => s.key === key);
        return saved ? saved.visible !== false : true;
      })
    : DEFAULT_VISIBLE_COLUMNS;

  return (
    <PageWrapper>
      <Stack gap="xl">
        {/* Header renders immediately - zero data dependency */}
        <PeopleHeaderClient />

        {/* Table streams in once contacts query prefetch resolves */}
        <Suspense fallback={<PeopleTableSkeleton columns={visibleColumns} />}>
          <PeopleTableLoader filter={filter} savedColumnVisibility={savedColumnVisibility} />
        </Suspense>
      </Stack>
    </PageWrapper>
  );
}
