"use client";

import { Box, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { GroupCard } from "@/app/(app)/app/(shell)/groups/components/GroupCard";
import { PeopleMap } from "@/components/map/PeopleMap";
import { TagPill } from "@/components/tags/TagPill";
import { STORE_SHOT_COPY } from "../../_lib/copy";
import {
  CLASS_OF_2027_GROUP,
  CYCLING_GROUP,
  STORE_SHOT_MAP_CENTER,
  STORE_SHOT_MAP_MARKERS,
  STORE_SHOT_TAGS,
  YC_GROUP,
} from "../../_lib/fixtures";
import { StoreShotFrame } from "../StoreShotFrame";

const NOOP = () => {};
export function StayOrganizedShot() {
  const copy = STORE_SHOT_COPY["stay-organized"];

  return (
    <StoreShotFrame headline={copy.headline}>
      <Stack gap="sm" w={650}>
        <Paper bg="white" p={6} radius="xl" shadow="sm">
          <Group gap={6} wrap="wrap">
            {STORE_SHOT_TAGS.map((tag) => (
              <TagPill color={tag.color} key={tag.label} label={tag.label} size="md" />
            ))}
          </Group>
        </Paper>

        <Group align="stretch" className="store-shot-groups" gap="sm" grow wrap="nowrap">
          {[CLASS_OF_2027_GROUP, YC_GROUP, CYCLING_GROUP].map((group) => (
            <Box key={group.id}>
              <GroupCard
                group={group}
                interactive={false}
                onAddPeople={NOOP}
                onClick={NOOP}
                onDelete={NOOP}
                onDuplicate={NOOP}
                onEdit={NOOP}
                shadow="md"
                showMenu={false}
                variant="small"
              />
            </Box>
          ))}
        </Group>

        <Paper bg="white" radius="xl" shadow="lg" style={{ overflow: "hidden" }}>
          <PeopleMap
            center={STORE_SHOT_MAP_CENTER}
            disableAutoFit
            disableChipNavigation
            height={210}
            hideZoomControls
            markers={STORE_SHOT_MAP_MARKERS}
            scrollWheelZoom={false}
            zoom={5}
          />
        </Paper>

        <Paper bg="white" p="sm" radius="xl" shadow="md">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon color="grape" radius="xl" size={38} variant="light">
              <IconSparkles size={20} stroke={1.6} />
            </ThemeIcon>
            <Text c="dark.8" fw={600} fz={16}>
              Who haven&apos;t I talked to in a while?
            </Text>
          </Group>
        </Paper>
      </Stack>
    </StoreShotFrame>
  );
}
