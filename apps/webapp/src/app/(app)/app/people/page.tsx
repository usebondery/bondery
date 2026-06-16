import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Stack } from "@mantine/core";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PeopleHeaderClient } from "./components/PeopleHeaderClient";
import { PeopleTableLoader } from "./components/PeopleTableLoader";
import { PeopleTableSkeleton } from "./components/PeopleSkeletons";
import type { SortOrder } from "./getContactsData";
import type { ColumnKey } from "@/app/(app)/app/components/contacts/ContactsTableV2";

export const metadata: Metadata = { title: "People" };

const COLUMN_VISIBILITY_COOKIE = "bondery_contacts_columns";

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
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  // Await only the fast parts - params and cookies. The contacts DB query is
  // deferred to PeopleTableLoader so this component returns JSX immediately
  // and the header renders before data arrives.
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);

  const query = params.q;
  const sort = params.sort as SortOrder | undefined;

  // Read column visibility preferences from cookie so the streamed PeopleClient
  // initialises with the correct columns - no client-side layout shift.
  const raw = cookieStore.get(COLUMN_VISIBILITY_COOKIE)?.value;
  let savedColumnVisibility: { key: string; visible: boolean }[] | undefined;
  try {
    if (raw) {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      if (Array.isArray(parsed))
        savedColumnVisibility = parsed as { key: string; visible: boolean }[];
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

        {/* Table streams in once getContactsData resolves */}
        <Suspense fallback={<PeopleTableSkeleton columns={visibleColumns} />}>
          <PeopleTableLoader
            query={query}
            sort={sort}
            savedColumnVisibility={savedColumnVisibility}
          />
        </Suspense>
      </Stack>
    </PageWrapper>
  );
}
