"use client";

import type { Contact } from "@bondery/types";
import { PeopleClient } from "./PeopleClient";

interface RelationshipsClientProps {
  initialContacts: Contact[];
  totalCount: number;
}

export function RelationshipsClient({ initialContacts, totalCount }: RelationshipsClientProps) {
  return (
    <PeopleClient initialContacts={initialContacts} totalCount={totalCount} layout="container" />
  );
}
