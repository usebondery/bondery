"use client";

import type { Contact } from "@bondery/types";
import { PeopleClient } from "./PeopleClient";

interface Stats {
  totalContacts: number;
  thisMonthInteractions: number;
  newContactsThisYear: number;
}

interface RelationshipsClientProps {
  initialContacts: Contact[];
  totalCount: number;
  stats: Stats;
}

export function RelationshipsClient({
  initialContacts,
  totalCount,
  stats,
}: RelationshipsClientProps) {
  return (
    <PeopleClient
      initialContacts={initialContacts}
      totalCount={totalCount}
      stats={stats}
      layout="container"
    />
  );
}
