"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { type RefObject, useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { LockModel, type StagePointer } from "./LockModel";
import { ENV_INTENSITY } from "./lock-geometry";

interface LockSceneProps {
  /** `true` while the stage is on screen. Rendering pauses otherwise. */
  active: boolean;
  /** `true` once the lock should close. */
  closed: boolean;
  /** Called when the WebGL context cannot be created or is lost. */
  onFailure: () => void;
  /** Called once the first frame exists. */
  onReady: () => void;
  pointer: RefObject<StagePointer>;
  /** `true` renders one still frame of the closed lock. */
  reducedMotion: boolean;
}

/**
 * Lights the scene from a generated room instead of an HDR file, so the scene never fetches
 * anything (the page CSP allows no other connections).
 */
function RoomLighting() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(room, 0.04);
    // biome-ignore lint/nursery/useReactCompiler: the three.js scene is an external mutable object, updated inside an effect and never during render
    scene.environment = target.texture;
    scene.environmentIntensity = ENV_INTENSITY;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      room.dispose();
    };
  }, [gl, scene, invalidate]);

  return null;
}

/** The R3F canvas for the padlock. Default export so `next/dynamic` can load it lazily. */
function LockScene({ closed, active, reducedMotion, pointer, onReady, onFailure }: LockSceneProps) {
  let frameloop: "always" | "demand" = "demand";
  if (active && !reducedMotion) {
    frameloop = "always";
  }

  return (
    <Canvas
      camera={{ far: 30, fov: 30, near: 0.1, position: [0, 0, 6.3] }}
      className="pointer-events-none"
      dpr={[1, 2]}
      frameloop={frameloop}
      // Neutral tone mapping keeps base colors true; the default ACES shifts the brand purple to pink.
      gl={{ alpha: true, antialias: true, toneMapping: THREE.NeutralToneMapping }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", onFailure, { once: true });
        onReady();
      }}
      style={{ touchAction: "pan-y" }}
    >
      <RoomLighting />
      <directionalLight color="#fff4e6" intensity={1.1} position={[-2.5, 3, 3.5]} />
      <directionalLight color="#e9e4ff" intensity={0.3} position={[3, 0.5, 2]} />
      <LockModel animated={!reducedMotion} closed={closed || reducedMotion} pointer={pointer} />
    </Canvas>
  );
}

export type { LockSceneProps };
export default LockScene;
