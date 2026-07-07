import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type {
  Activity,
  Contact,
  ContactRelationshipWithPeople,
  Group,
  ImportantDate,
  LinkedInDataResponse,
  MergeRecommendation,
  Tag,
  WorkHistoryEntry,
  EducationEntry,
} from "@bondery/schemas";
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
  initialContact,
  ...personClientProps
}: PersonLoaderProps) {
  const queryClient = getQueryClient();

  queryClient.setQueryData(contactKeys.detail(personId), initialContact);

  const linkedInInitialData: LinkedInDataResponse = {
    workHistory: personClientProps.initialWorkHistory,
    education: personClientProps.initialEducation,
    linkedinBio: personClientProps.initialLinkedinBio ?? null,
    syncedAt: personClientProps.initialSyncedAt ?? null,
  };
  queryClient.setQueryData(contactKeys.linkedin(personId), linkedInInitialData);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PersonClient
        personId={personId}
        initialTab={initialTab}
        myselfMode={myselfMode}
        initialContact={initialContact}
        {...personClientProps}
      />
    </HydrationBoundary>
  );
}
