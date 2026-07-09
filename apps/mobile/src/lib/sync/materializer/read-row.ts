export type ShapeOperation = "insert" | "update" | "delete";

export interface ShapeRowMessage {
  operation: ShapeOperation;
  value: Record<string, unknown>;
}

export function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

export function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readBoolInt(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (value === true || value === 1 || value === "1" || value === "t") {
    return 1;
  }
  return 0;
}

export function parseGisPointLatLon(gisPoint: string | null): {
  latitude: number | null;
  longitude: number | null;
} {
  if (!gisPoint) {
    return { latitude: null, longitude: null };
  }

  const pointMatch = gisPoint.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (pointMatch) {
    const longitude = Number(pointMatch[1]);
    const latitude = Number(pointMatch[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return { latitude: null, longitude: null };
}
