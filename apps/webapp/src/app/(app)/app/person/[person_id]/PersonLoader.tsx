import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type {
  Activity,
  Contact,
  ContactRelationshipWithPeople,
  Group,
  ImportantDate,
  MergeRecommendation,
  Tag,
  WorkHistoryEntry,
  EducationEntry,
} from "@bondery/schemas";
import { createContactDetailQueryFn } from "@/lib/query/fetchers/serverQueryFns";
import { contactKeys } from "@/lib/query/keys";
import { getQueryClient } from "@/lib/query/client";
import PersonClient from "./PersonClient";

interface PersonLoaderProps {
  personId: string;
  initialTab?: string;
  myselfMode?: boolean;
  initialContact: Contact;
  initialConnectedContacts: Contact[];
  initialSelectableContacts: Contact[];
  initialRelationships: ContactRelationshipWithPeople[];
  initialImportantDates: ImportantDate[];
  initialGroups: Group[];
  initialPersonGroups: Group[];
  initialAllTags: Tag[];
  initialPersonTags: Tag[];
  initialActivities: Activity[];
  initialWorkHistory: WorkHistoryEntry[];
  initialEducation: EducationEntry[];
  initialLinkedinBio?: string | null;
  initialSyncedAt?: string | null;
  initialMergeRecommendation?: MergeRecommendation | null;
}

export async function PersonLoader({
  personId,
  initialTab,
  myselfMode,
  ...personClientProps
}: PersonLoaderProps) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: contactKeys.detail(personId),
    queryFn: createContactDetailQueryFn(personId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PersonClient
        personId={personId}
        initialTab={initialTab}
        myselfMode={myselfMode}
        {...personClientProps}
      />
    </HydrationBoundary>
  );
}
