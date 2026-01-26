"use client";

import { useEffect, useMemo, useRef } from "react";
import { Stack, Text } from "@mantine/core";
import { MapContainer, Marker, useMap } from "react-leaflet";
import { DivIcon } from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";

// @ts-ignore
import L from "leaflet";
// @ts-ignore
import "@maplibre/maplibre-gl-leaflet";

interface PersonMapProps {
  latitude: number;
  longitude: number;
  name: string;
  avatarUrl?: string | null;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return `${first}${last}`.toUpperCase();
}

function MapLibreLayer() {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || layerRef.current) return;

    // @ts-ignore
    const gl = L.maplibreGL({
      style: STYLE_URL,
    }).addTo(map);

    layerRef.current = gl;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

export function PersonMap({ latitude, longitude, name, avatarUrl }: PersonMapProps) {
  const markerIcon = useMemo(() => {
    const initials = getInitials(name);
    const avatarHtml = avatarUrl
      ? `<div style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); background: white;">
          <img src="${avatarUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover;" />
         </div>`
      : `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 16px; font-family: system-ui, -apple-system, sans-serif;">
          ${initials}
         </div>`;

    return new DivIcon({
      className: "person-map-avatar-icon",
      html: avatarHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  }, [avatarUrl, name]);

  return (
    <Stack gap="sm">
      <Text fw={600}>Location</Text>
      <MapContainer
        key={`${latitude}-${longitude}`}
        center={[latitude, longitude]}
        zoom={13}
        scrollWheelZoom
        style={{ height: 360, width: "100%", borderRadius: "12px", overflow: "hidden" }}
      >
        <MapLibreLayer />
        <Marker position={[latitude, longitude]} icon={markerIcon} />
      </MapContainer>
    </Stack>
  );
}
