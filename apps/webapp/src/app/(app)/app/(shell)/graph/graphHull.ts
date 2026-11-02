import type { RelationshipGraphGroup } from "@bondery/schemas";

export function stableGroupColor(id: string): string {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  return `hsl(${hue} 42% 46%)`;
}

export function groupColor(group: Pick<RelationshipGraphGroup, "color" | "id">): string {
  const color = group.color?.trim();
  if (color) {
    return color;
  }
  return stableGroupColor(group.id);
}

export function groupCaption(group: Pick<RelationshipGraphGroup, "emoji" | "label">): string {
  const emoji = group.emoji?.trim();
  if (emoji) {
    return `${emoji} ${group.label}`;
  }
  return group.label;
}

/** Circle that contains every member center, plus padding for the avatar. */
export function groupCircle(
  points: ReadonlyArray<readonly [number, number]>,
  pad: number,
): { cx: number; cy: number; r: number } | null {
  if (points.length === 0) {
    return null;
  }
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  cx /= points.length;
  cy /= points.length;
  let radius = pad;
  for (const [x, y] of points) {
    const distance = Math.hypot(x - cx, y - cy) + pad;
    if (distance > radius) {
      radius = distance;
    }
  }
  return { cx, cy, r: radius };
}

export type GraphCircle = { cx: number; cy: number; r: number };

/** Move a point to the rim of every circle that contains it. */
export function pushOutsideCircles(
  x: number,
  y: number,
  circles: readonly GraphCircle[],
): { x: number; y: number } {
  let px = x;
  let py = y;
  for (let pass = 0; pass < circles.length; pass += 1) {
    let changed = false;
    for (const circle of circles) {
      const dx = px - circle.cx;
      const dy = py - circle.cy;
      const distance = Math.hypot(dx, dy);
      if (distance >= circle.r) {
        continue;
      }
      changed = true;
      if (distance < 1e-6) {
        px = circle.cx + circle.r;
        py = circle.cy;
      } else {
        const scale = circle.r / distance;
        px = circle.cx + dx * scale;
        py = circle.cy + dy * scale;
      }
    }
    if (!changed) {
      break;
    }
  }
  return { x: px, y: py };
}
