import { BRAND_PRIMARY_SHADES } from "@bondery/branding";
import * as THREE from "three";

/** Body size in scene units. */
export const BODY = { depth: 0.6, height: 1.25, radius: 0.18, segments: 6, width: 1.6 } as const;

/** Shackle tube radius, inner opening width, straight leg length above the body, and depth into it. */
export const SHACKLE = {
  innerWidth: 0.95,
  legHeight: 0.28,
  radialSegments: 20,
  sink: 0.2,
  tubeRadius: 0.12,
  tubularSegments: 64,
} as const;

/** Shackle pose before the lock closes: raised, and swung open around the left leg. */
export const SHACKLE_OPEN = { lift: 0.45, swing: THREE.MathUtils.degToRad(25) } as const;

/** Colors. The body and keyhole come from the brand scale so the render matches the rest of the site. */
export const COLORS = {
  body: BRAND_PRIMARY_SHADES[5],
  keyhole: BRAND_PRIMARY_SHADES[9],
  keyholeGlow: BRAND_PRIMARY_SHADES[2],
  shackle: "#ECE6F2",
} as const;

/**
 * Material settings. A matte, soft-touch body: no clearcoat, high roughness, so it reads as the
 * flat brand color with soft shading instead of a glossy highlight. The shackle is brushed metal.
 */
export const MATERIALS = {
  body: { clearcoat: 0, metalness: 0, roughness: 0.62 },
  shackle: { metalness: 0.9, roughness: 0.45 },
} as const;

/**
 * Environment light strength. At 0.5, with the key and fill lights and neutral tone mapping, the
 * lit front face renders at the brand hex in both color schemes. Higher values wash it out.
 */
export const ENV_INTENSITY = 0.5;

/** Rest pose: a slight three-quarter view. */
export const REST_ROTATION = { x: 0.08, y: -0.35 } as const;

/** Idle float and sway. Period is in seconds, amplitudes in scene units and radians. */
export const IDLE = {
  floatAmplitude: 0.03,
  floatPeriod: 6,
  swayAmplitude: THREE.MathUtils.degToRad(6),
  swayPeriod: 9,
} as const;

/** Pointer tilt limit in radians, and damping stiffness (higher is snappier). */
export const TILT = { lambda: 4, max: THREE.MathUtils.degToRad(12) } as const;

/** Close sequence timings in seconds. */
export const CLOSE = { click: 0.18, duration: 0.7, glow: 0.9 } as const;

/** Shackle center line: left leg up, semicircle over the top, right leg down. Origin is the left leg base. */
export function createShackleCurve(): THREE.CurvePath<THREE.Vector3> {
  const { innerWidth, tubeRadius, legHeight, sink } = SHACKLE;
  const arcRadius = (innerWidth + tubeRadius * 2) / 2;
  const width = arcRadius * 2;
  const path = new THREE.CurvePath<THREE.Vector3>();
  const baseY = -sink;
  const legTop = legHeight;
  path.add(new THREE.LineCurve3(new THREE.Vector3(0, baseY, 0), new THREE.Vector3(0, legTop, 0)));
  const arcPoints: THREE.Vector3[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i += 1) {
    const angle = Math.PI - (i / steps) * Math.PI;
    arcPoints.push(
      new THREE.Vector3(
        arcRadius + Math.cos(angle) * arcRadius,
        legTop + Math.sin(angle) * arcRadius,
        0,
      ),
    );
  }
  path.add(new THREE.CatmullRomCurve3(arcPoints, false, "centripetal"));
  path.add(
    new THREE.LineCurve3(new THREE.Vector3(width, legTop, 0), new THREE.Vector3(width, baseY, 0)),
  );
  return path;
}

/** Horizontal distance between the shackle legs, used to center it over the body. */
export const SHACKLE_WIDTH = SHACKLE.innerWidth + SHACKLE.tubeRadius * 2;

/** Keyhole outline: a circle with a tapered slot below it. Units match the body. */
export function createKeyholeShape(): THREE.Shape {
  const circleRadius = 0.1;
  const circleY = 0.06;
  const slotBottom = 0.032;
  const slotLength = 0.22;
  /** Angle below the circle where the slot joins it. */
  const joinAngle = 0.45;
  const shape = new THREE.Shape();
  shape.absarc(
    0,
    circleY,
    circleRadius,
    -Math.PI / 2 + joinAngle,
    (3 * Math.PI) / 2 - joinAngle,
    false,
  );
  shape.lineTo(-slotBottom, -slotLength);
  shape.lineTo(slotBottom, -slotLength);
  shape.closePath();
  return shape;
}

/** Keyhole extrude depth and how far it sits proud of the face. */
export const KEYHOLE = { depth: 0.012, offset: 0.004, y: -0.02 } as const;
