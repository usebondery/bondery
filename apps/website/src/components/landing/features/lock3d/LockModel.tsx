"use client";

import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  BODY,
  CLOSE,
  COLORS,
  createKeyholeShape,
  createShackleCurve,
  IDLE,
  KEYHOLE,
  MATERIALS,
  REST_ROTATION,
  SHACKLE,
  SHACKLE_OPEN,
  SHACKLE_WIDTH,
  TILT,
} from "./lock-geometry";

/** Pointer position over the stage, from -1 to 1 on each axis. `null` when the pointer is away. */
type StagePointer = { x: number; y: number } | null;

interface LockModelProps {
  /** `false` renders the closed lock still: no close sequence, no idle motion, no tilt. */
  animated: boolean;
  /** `true` once the lock should be closed. Before that the shackle is raised and swung open. */
  closed: boolean;
  /** Written by the parent on pointer events, read each frame. */
  pointer: RefObject<StagePointer>;
}

/** Vertical offset that centers the closed lock (body plus shackle) in the frame. */
const MODEL_OFFSET_Y = -0.45;

/** Overshoots slightly, so the shackle seats into the body with a little spring. */
function easeOutBack(t: number): number {
  const c1 = 1.1;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * The padlock: a coated body, a satin shackle and a keyhole. Every pose is a pure function of the
 * clock, the `closed` flag and the pointer, written to the meshes inside `useFrame`.
 */
function LockModel({ closed, animated, pointer }: LockModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const shackleRef = useRef<THREE.Group>(null);
  const keyholeMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const closeStartRef = useRef<number | null>(null);
  const tiltRef = useRef({ x: 0, y: 0 });

  const bodyGeometry = useMemo(
    () => new RoundedBoxGeometry(BODY.width, BODY.height, BODY.depth, BODY.segments, BODY.radius),
    [],
  );
  const shackleGeometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        createShackleCurve(),
        SHACKLE.tubularSegments,
        SHACKLE.tubeRadius,
        SHACKLE.radialSegments,
        false,
      ),
    [],
  );
  const keyholeGeometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(createKeyholeShape(), {
        bevelEnabled: false,
        depth: KEYHOLE.depth,
      }),
    [],
  );

  // Geometries are built imperatively, so R3F does not dispose them.
  useEffect(
    () => () => {
      bodyGeometry.dispose();
      shackleGeometry.dispose();
      keyholeGeometry.dispose();
    },
    [bodyGeometry, shackleGeometry, keyholeGeometry],
  );

  useFrame((state, delta) => {
    const root = rootRef.current;
    const bodyGroup = bodyGroupRef.current;
    const shackle = shackleRef.current;
    const keyholeMaterial = keyholeMaterialRef.current;
    if (!root || !bodyGroup || !shackle || !keyholeMaterial) {
      return;
    }

    const now = state.clock.elapsedTime;
    if (closed && closeStartRef.current === null) {
      closeStartRef.current = now;
    }

    // Seconds since the lock closed. Static mode counts as long finished.
    let sinceClose = Number.NEGATIVE_INFINITY;
    if (!animated) {
      sinceClose = Number.POSITIVE_INFINITY;
    } else if (closeStartRef.current !== null) {
      sinceClose = now - closeStartRef.current;
    }

    const swingProgress = easeOutCubic(
      THREE.MathUtils.clamp(sinceClose / (CLOSE.duration * 0.6), 0, 1),
    );
    const dropProgress = easeOutBack(THREE.MathUtils.clamp(sinceClose / CLOSE.duration, 0, 1));
    shackle.position.y = BODY.height / 2 + SHACKLE_OPEN.lift * (1 - dropProgress);
    shackle.rotation.y = SHACKLE_OPEN.swing * (1 - swingProgress);

    // A short click once the shackle seats, and one pulse of light in the keyhole.
    const clickProgress = THREE.MathUtils.clamp((sinceClose - CLOSE.duration) / CLOSE.click, 0, 1);
    const clickScale = 1 - 0.03 * Math.sin(Math.PI * clickProgress);
    bodyGroup.scale.setScalar(clickScale);
    const glowProgress = THREE.MathUtils.clamp((sinceClose - CLOSE.duration) / CLOSE.glow, 0, 1);
    keyholeMaterial.emissiveIntensity = Math.sin(Math.PI * glowProgress);

    // Idle motion eases in after the click so the close sequence reads on its own.
    const idleWeight = animated
      ? THREE.MathUtils.clamp(sinceClose - CLOSE.duration - CLOSE.click, 0, 1)
      : 0;
    const float =
      Math.sin((now / IDLE.floatPeriod) * Math.PI * 2) * IDLE.floatAmplitude * idleWeight;
    const sway = Math.sin((now / IDLE.swayPeriod) * Math.PI * 2) * IDLE.swayAmplitude * idleWeight;

    const target = animated ? pointer.current : null;
    const tilt = tiltRef.current;
    tilt.x = THREE.MathUtils.damp(tilt.x, (target?.y ?? 0) * TILT.max, TILT.lambda, delta);
    tilt.y = THREE.MathUtils.damp(tilt.y, (target?.x ?? 0) * TILT.max, TILT.lambda, delta);

    root.position.y = MODEL_OFFSET_Y + float;
    root.rotation.x = REST_ROTATION.x + tilt.x;
    root.rotation.y = REST_ROTATION.y + sway + tilt.y;
  });

  return (
    <group position={[0, MODEL_OFFSET_Y, 0]} ref={rootRef}>
      <group ref={bodyGroupRef}>
        <mesh geometry={bodyGeometry}>
          <meshPhysicalMaterial color={COLORS.body} {...MATERIALS.body} />
        </mesh>
        <mesh geometry={keyholeGeometry} position={[0, KEYHOLE.y, BODY.depth / 2 + KEYHOLE.offset]}>
          <meshStandardMaterial
            color={COLORS.keyhole}
            emissive={COLORS.keyholeGlow}
            emissiveIntensity={0}
            ref={keyholeMaterialRef}
            roughness={0.6}
          />
        </mesh>
      </group>
      <group position={[-SHACKLE_WIDTH / 2, BODY.height / 2, 0]} ref={shackleRef}>
        <mesh geometry={shackleGeometry}>
          <meshStandardMaterial color={COLORS.shackle} {...MATERIALS.shackle} />
        </mesh>
      </group>
    </group>
  );
}

export type { LockModelProps, StagePointer };
export { LockModel };
