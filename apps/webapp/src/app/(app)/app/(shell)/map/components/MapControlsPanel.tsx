"use client";

import type { ContactAddressEntry } from "@bondery/schemas";
import { Group, Paper, SegmentedControl, Stack, Tooltip } from "@mantine/core";
import { IconHome, IconMapPin, IconSearch } from "@tabler/icons-react";
import { LocationLookupInput } from "@/components/shell/LocationLookupInput";
import { useMapPageTranslations } from "@/lib/i18n/generated/hooks";
import { MAP_CHROME_Z_INDEX } from "../utils/mapConstants";
import type { MapView } from "../utils/types";

interface MapControlsPanelProps {
  locationQuery: string;
  onLocationQueryChange: (query: string) => void;
  onLocationSelect: (selected: ContactAddressEntry) => void;
  onViewChange: (value: string) => void;
  view: MapView;
}

/** Floating panel over the map: view switcher and location search. */
export function MapControlsPanel({
  locationQuery,
  onLocationQueryChange,
  onLocationSelect,
  onViewChange,
  view,
}: MapControlsPanelProps) {
  const t = useMapPageTranslations();

  return (
    <Paper
      p="xs"
      pos="absolute"
      radius="md"
      right={12}
      shadow="sm"
      style={{ width: "min(320px, calc(100% - 96px))", zIndex: MAP_CHROME_Z_INDEX }}
      top={12}
    >
      <Stack gap="xs">
        <SegmentedControl
          data={[
            {
              label: (
                <Tooltip label={t("ViewLocationsTooltip")} openDelay={400}>
                  <Group gap={6} justify="center" wrap="nowrap">
                    <IconMapPin size={14} />
                    <span>{t("ViewLocations")}</span>
                  </Group>
                </Tooltip>
              ),
              value: "locations",
            },
            {
              label: (
                <Tooltip label={t("ViewAddressesTooltip")} openDelay={400}>
                  <Group gap={6} justify="center" wrap="nowrap">
                    <IconHome size={14} />
                    <span>{t("ViewAddresses")}</span>
                  </Group>
                </Tooltip>
              ),
              value: "addresses",
            },
          ]}
          fullWidth
          onChange={onViewChange}
          size="xs"
          value={view}
        />
        <LocationLookupInput
          ariaLabel={t("SearchLabel")}
          leftSection={<IconSearch size={16} />}
          onChange={onLocationQueryChange}
          onSuggestionSelect={onLocationSelect}
          placeholder={t("SearchPlaceholder")}
          value={locationQuery}
        />
      </Stack>
    </Paper>
  );
}
