"use client";

import { ButtonLink, PersonCard, PersonChip } from "@bondery/mantine-next";
import type {
  RelationshipGraphEdge,
  RelationshipGraphHub,
  RelationshipGraphNode,
} from "@bondery/schemas";
import { Paper, Stack, Text } from "@mantine/core";
import { routePerson } from "@/lib/navigation/route/person";
import { relationshipPairKey } from "./collapseRelationshipEdges";
import { RelationshipSentence } from "./RelationshipSentence";

export function GraphSelectionPanel(
  props:
    | {
        cardEdges: RelationshipGraphEdge[];
        nodesById: Map<string, RelationshipGraphNode>;
        openPersonLabel: string;
        person: RelationshipGraphNode;
        selectedEdgeKey: string | null;
      }
    | {
        hub: RelationshipGraphHub;
        membersLabel: string;
        nodesById: Map<string, RelationshipGraphNode>;
      },
) {
  if ("hub" in props) {
    return (
      <Paper p="md" radius="md" style={{ overflow: "auto" }} w={360} withBorder>
        <Stack gap="sm">
          <Text fw={600}>{props.hub.label}</Text>
          <Text size="sm">{props.membersLabel}</Text>
          {props.hub.personIds.map((personId) => {
            const person = props.nodesById.get(personId);
            if (!person) {
              return null;
            }
            return <PersonChip isClickable key={person.id} person={person} size="sm" />;
          })}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="md" radius="md" style={{ overflow: "auto" }} w={360} withBorder>
      <Stack gap="sm">
        <PersonCard person={props.person} size="md" />
        {props.cardEdges.map((edge) => (
          <RelationshipSentence
            chips
            edge={edge}
            emphasized={
              relationshipPairKey(edge.sourcePersonId, edge.targetPersonId) ===
              props.selectedEdgeKey
            }
            key={`${edge.id}:${edge.relationshipType}`}
            linkNames={false}
            nodesById={props.nodesById}
          />
        ))}
        <ButtonLink href={routePerson(props.person.id)}>{props.openPersonLabel}</ButtonLink>
      </Stack>
    </Paper>
  );
}
