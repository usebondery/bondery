"use client";

import { useMemo } from "react";
import { Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { PeopleMap } from "@/app/(app)/app/components/map/PeopleMap";

interface PersonMapProps {
  latitude: number;
  longitude: number;
  name: string;
  avatarUrl?: string | null;
}

export function PersonMap({ latitude, longitude, name, avatarUrl }: PersonMapProps) {
  const t = useTranslations("MapCommon");

  const markers = useMemo(() => {
    return [
      {
        id: "person",
        name,
        latitude,
        longitude,
        avatarUrl,
      },
    ];
  }, [avatarUrl, latitude, longitude, name]);

  return (
    <Stack gap="sm">
      <Text fw={600}>{t("Location")}</Text>
      <PeopleMap markers={markers} center={[latitude, longitude]} zoom={13} height={360} />
    </Stack>
  );
}
