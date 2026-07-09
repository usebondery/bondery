"use client";

import { Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { PeopleMap } from "@/components/map/PeopleMap";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

interface PersonMapProps {
  avatarUrl?: string | null;
  latitude: number;
  longitude: number;
  name: string;
}

export function PersonMap({ latitude, longitude, name, avatarUrl }: PersonMapProps) {
  const t = useWebTranslations("MapCommon");

  const markers = useMemo(() => {
    return [
      {
        avatarUrl,
        id: "person",
        latitude,
        longitude,
        name,
      },
    ];
  }, [avatarUrl, latitude, longitude, name]);

  return (
    <Stack gap="sm">
      <Text fw={600}>{t("Location")}</Text>
      <PeopleMap center={[latitude, longitude]} height={360} markers={markers} zoom={13} />
    </Stack>
  );
}
