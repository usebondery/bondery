"use client";

import { PersonAvatarTooltip } from "@bondery/mantine-next";
import { Marker, type MarkerEvent, useMap } from "@vis.gl/react-maplibre";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Supercluster from "supercluster";
import { routeAssert } from "@/lib/navigation/route/assert";
import { ClusterMapBubble, PersonMapAvatarMarker } from "./mapMarkerIcons";
import type { PeopleMapMarker } from "./PeopleMap";

const CLUSTER_RADIUS_PX = 50;

type ClusterPointProperties = {
  markerId: string;
};

type ClusterFeature = Supercluster.ClusterFeature<ClusterPointProperties>;
type PointFeature = Supercluster.PointFeature<ClusterPointProperties>;
type MapClusterItem = ClusterFeature | PointFeature;

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readPointCoordinates(
  coordinates: unknown,
): { latitude: number; longitude: number } | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }
  const longitude = coordinates[0];
  const latitude = coordinates[1];
  if (!isFiniteCoordinate(longitude) || !isFiniteCoordinate(latitude)) {
    return null;
  }
  if (latitude < -90 || latitude > 90) {
    return null;
  }
  return { latitude, longitude };
}

export function ClusteredPersonMarkers({
  markers,
  disableChipNavigation,
}: {
  disableChipNavigation: boolean;
  markers: PeopleMapMarker[];
}) {
  const { current: map } = useMap();
  const router = useRouter();
  const [items, setItems] = useState<MapClusterItem[]>([]);

  const validMarkers = useMemo(
    () =>
      markers.filter(
        (marker) =>
          isFiniteCoordinate(marker.latitude) && isFiniteCoordinate(marker.longitude),
      ),
    [markers],
  );

  const markersById = useMemo(() => {
    const mapById = new Map<string, PeopleMapMarker>();
    for (const marker of validMarkers) {
      mapById.set(marker.id, marker);
    }
    return mapById;
  }, [validMarkers]);

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<ClusterPointProperties>({
      maxZoom: 20,
      radius: CLUSTER_RADIUS_PX,
    });

    const points: PointFeature[] = validMarkers.map((marker) => ({
      geometry: {
        coordinates: [marker.longitude, marker.latitude],
        type: "Point",
      },
      properties: { markerId: marker.id },
      type: "Feature",
    }));

    index.load(points);
    return index;
  }, [validMarkers]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const refresh = () => {
      try {
        const bounds = map.getBounds();
        if (!bounds || bounds.isEmpty()) {
          setItems([]);
          return;
        }

        const zoom = Math.max(0, Math.floor(map.getZoom()));
        const next = clusterIndex.getClusters(
          [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
          zoom,
        );
        setItems(next as MapClusterItem[]);
      } catch {
        setItems([]);
      }
    };

    const onLoad = () => {
      refresh();
    };

    if (map.isStyleLoaded()) {
      refresh();
    } else {
      map.once("load", onLoad);
    }

    map.on("moveend", refresh);
    map.on("zoomend", refresh);

    return () => {
      map.off("load", onLoad);
      map.off("moveend", refresh);
      map.off("zoomend", refresh);
    };
  }, [map, clusterIndex]);

  const handleClusterClick = (feature: ClusterFeature) => {
    if (!map) {
      return;
    }

    const coords = readPointCoordinates(feature.geometry?.coordinates);
    if (!coords) {
      return;
    }

    const clusterId = feature.properties.cluster_id;
    const expansionZoom = Math.min(
      clusterIndex.getClusterExpansionZoom(clusterId),
      map.getMaxZoom(),
    );

    map.easeTo({
      center: [coords.longitude, coords.latitude],
      zoom: expansionZoom,
    });
  };

  return (
    <>
      {items.map((feature) => {
        const coords = readPointCoordinates(feature.geometry?.coordinates);
        if (!coords) {
          return null;
        }

        if ("cluster" in feature.properties && feature.properties.cluster) {
          const clusterFeature = feature as ClusterFeature;
          const count = clusterFeature.properties.point_count;

          return (
            <Marker
              anchor="center"
              key={`cluster-${clusterFeature.properties.cluster_id}`}
              latitude={coords.latitude}
              longitude={coords.longitude}
              onClick={(event: MarkerEvent<MouseEvent>) => {
                event.originalEvent.stopPropagation();
                handleClusterClick(clusterFeature);
              }}
              style={{ cursor: "pointer" }}
            >
              <ClusterMapBubble count={count} />
            </Marker>
          );
        }

        const pointFeature = feature as PointFeature;
        const marker = markersById.get(pointFeature.properties.markerId);
        if (!marker) {
          return null;
        }

        const nameParts = marker.name.trim().split(/\s+/).filter(Boolean);
        const firstName = marker.firstName || nameParts[0] || marker.name;
        const lastName =
          marker.lastName ?? (nameParts.length > 1 ? nameParts.slice(1).join(" ") : null);

        const canNavigate = Boolean(marker.href) && !disableChipNavigation;

        return (
          <Marker
            anchor="center"
            key={`${marker.id}-${marker.latitude}-${marker.longitude}`}
            latitude={marker.latitude}
            longitude={marker.longitude}
            onClick={
              canNavigate
                ? (event: MarkerEvent<MouseEvent>) => {
                    event.originalEvent.stopPropagation();
                    router.push(routeAssert(marker.href as string));
                  }
                : undefined
            }
            style={{ cursor: canNavigate ? "pointer" : "default" }}
          >
            <PersonAvatarTooltip
              person={{
                avatar: marker.avatarUrl ?? null,
                firstName,
                headline: marker.headline ?? null,
                id: marker.personId ?? marker.id,
                lastName,
                location: marker.location ?? null,
              }}
            >
              <PersonMapAvatarMarker
                avatarUrl={marker.avatarUrl}
                firstName={firstName}
                lastName={lastName}
                name={marker.name}
              />
            </PersonAvatarTooltip>
          </Marker>
        );
      })}
    </>
  );
}
