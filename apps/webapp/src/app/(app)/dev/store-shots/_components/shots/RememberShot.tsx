"use client";

import type { Activity, InteractionParticipant, PersonPreview } from "@bondery/schemas";
import { Box } from "@mantine/core";
import { InteractionsList } from "@/components/interactions/InteractionsList";
import { STORE_SHOT_COPY } from "../../_lib/copy";
import { STORE_SHOT_ACTIVITIES } from "../../_lib/fixtures";
import { StoreShotFrame } from "../StoreShotFrame";

const NOOP = () => {};

function resolveParticipants(activity: Activity): PersonPreview[] {
  return (activity.participants ?? [])
    .filter((participant): participant is InteractionParticipant => typeof participant !== "string")
    .map((participant) => ({
      avatar: participant.avatar,
      firstName: participant.firstName,
      headline: participant.headline,
      id: participant.id,
      lastName: participant.lastName,
      location: participant.location,
      middleName: participant.middleName,
    }));
}

export function RememberShot() {
  const copy = STORE_SHOT_COPY.remember;

  return (
    <StoreShotFrame headline={copy.headline}>
      <Box
        className="store-shot-timeline store-shot-light-timeline"
        data-mantine-color-scheme="light"
        w={620}
      >
        <InteractionsList
          actionsLabel="Actions"
          activities={STORE_SHOT_ACTIVITIES}
          deleteLabel="Delete"
          duplicateLabel="Duplicate"
          editLabel="Edit"
          onDelete={NOOP}
          onDuplicate={NOOP}
          onEdit={NOOP}
          onOpen={NOOP}
          resolveParticipants={resolveParticipants}
        />
      </Box>
    </StoreShotFrame>
  );
}
