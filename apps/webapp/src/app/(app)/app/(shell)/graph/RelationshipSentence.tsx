"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { AnchorLink, PersonChip } from "@bondery/mantine-next";
import type { RelationshipGraphEdge, RelationshipGraphNode } from "@bondery/schemas";
import { Text } from "@mantine/core";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  useGraphPageTranslations,
  usePersonRelationshipsTranslations,
} from "@/lib/i18n/generated/hooks";
import { TypedTrans } from "@/lib/i18n/TypedTrans";
import { routePerson } from "@/lib/navigation/route/person";

function GraphTransLink({
  children,
  href,
  link,
}: {
  children?: ReactNode;
  href: Route;
  link: boolean;
}) {
  if (!link) {
    return <span>{children}</span>;
  }
  return <AnchorLink href={href}>{children}</AnchorLink>;
}

function SentenceChip({ person }: { person: RelationshipGraphNode }) {
  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
      <PersonChip isClickable person={person} size="sm" />
    </span>
  );
}

export function RelationshipSentence({
  chips = false,
  edge,
  emphasized,
  linkNames,
  nodesById,
}: {
  chips?: boolean;
  edge: RelationshipGraphEdge;
  emphasized: boolean;
  linkNames: boolean;
  nodesById: Map<string, RelationshipGraphNode>;
}) {
  const t = useGraphPageTranslations();
  const types = usePersonRelationshipsTranslations("Types");
  const source = nodesById.get(edge.sourcePersonId);
  const target = nodesById.get(edge.targetPersonId);
  if (!source || !target) {
    return null;
  }
  const sentenceKey = edge.relationshipType === "other" ? "SentenceOther" : "Sentence";
  const typeLabel = types(edge.relationshipType).toLocaleLowerCase();
  return (
    <Text fw={emphasized ? 600 : undefined} size="sm">
      <TypedTrans
        components={{
          source: chips ? (
            <SentenceChip person={source} />
          ) : (
            <GraphTransLink href={routePerson(source.id)} link={linkNames}>
              {null}
            </GraphTransLink>
          ),
          target: chips ? (
            <SentenceChip person={target} />
          ) : (
            <GraphTransLink href={routePerson(target.id)} link={linkNames}>
              {null}
            </GraphTransLink>
          ),
        }}
        i18nKey={sentenceKey}
        t={t}
        values={{
          source: formatContactName(source),
          target: formatContactName(target),
          type: typeLabel,
        }}
      />
    </Text>
  );
}
