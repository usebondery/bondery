import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getGroupDetailServer } from "@/lib/api/domains/server/groups";
import { getWebTranslations as getTranslations } from "@/lib/i18n/getWebTranslations";
import { entityPageTitle } from "@/lib/metadata/pageTitles";
import { parseContactsListParams } from "@/lib/query/contactsListParams";
import { GroupDetailLoader } from "./GroupDetailLoader";

const getGroupForPage = cache(getGroupDetailServer);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  try {
    const group = await getGroupForPage(groupId);
    return entityPageTitle(group.label);
  } catch {
    const t = await getTranslations("GroupsPage");
    return entityPageTitle(t("FallbackTitle"));
  }
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ search?: string; sort?: string }>;
}) {
  const [{ groupId }, { search, sort }] = await Promise.all([params, searchParams]);
  const filter = parseContactsListParams({ search, sort });

  try {
    await getGroupForPage(groupId);
  } catch {
    notFound();
  }

  return <GroupDetailLoader filter={filter} groupId={groupId} />;
}
