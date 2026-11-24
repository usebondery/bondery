"use client";

import { useInView, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Component, type PointerEvent, type ReactNode, useRef, useState } from "react";
import { OwnershipVisual } from "../OwnershipVisual";
import type { StagePointer } from "./LockModel";

/** three.js stays out of the initial bundle: it loads when the section nears the viewport. */
const LockScene = dynamic(() => import("./LockScene"), { ssr: false });

/** How far outside the viewport the scene starts loading. */
const LOAD_MARGIN = "200px";

/** Shows the fallback when the scene throws, for example when the GL context cannot be created. */
class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state: { failed: boolean } = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** `true` when the browser can create a WebGL context. The probe context is released at once. */
function probeWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      return false;
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

let webglSupport: boolean | undefined;

/** Runs the WebGL probe once per page load and keeps the answer. */
function hasWebGL(): boolean {
  webglSupport ??= probeWebGL();
  return webglSupport;
}

/**
 * A 3D padlock in the brand primary colour for the privacy section. The shackle swings closed
 * once when the lock is half visible. The flat `OwnershipVisual` fills the same box while the
 * scene loads, and stays when WebGL is missing or fails. The lock is decorative, so the whole
 * stage is hidden from assistive technology.
 */
export function LockVisual() {
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<StagePointer>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const nearViewport = useInView(stageRef, { margin: LOAD_MARGIN, once: true });
  const onScreen = useInView(stageRef);
  const shouldClose = useInView(stageRef, { amount: 0.5, once: true });

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const showScene = nearViewport && !failed && hasWebGL();

  // Only a mouse tilts the lock. Touch and pen pointers skip it so scroll gestures stay untouched.
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
    };
  }

  function handlePointerLeave() {
    pointerRef.current = null;
  }

  return (
    <div aria-hidden="true" className="flex w-full justify-center">
      <div
        className="size-lock md:size-lock-md relative"
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        ref={stageRef}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="max-md:scale-lock-fallback absolute inset-0 flex items-center justify-center transition-opacity duration-300"
          style={{ opacity: ready && showScene ? 0 : 1 }}
        >
          <OwnershipVisual />
        </div>

        {showScene ? (
          <>
            <div
              className="top-lock-shadow h-lock-shadow w-lock-shadow absolute left-1/2 -translate-x-1/2 rounded-full blur-md"
              style={{
                background:
                  "radial-gradient(closest-side, light-dark(rgba(60, 20, 90, 0.28), rgba(0, 0, 0, 0.55)), transparent)",
                opacity: ready ? 1 : 0,
              }}
            />
            <div className="-inset-lock-scene absolute">
              <SceneBoundary onError={() => setFailed(true)}>
                <LockScene
                  active={onScreen}
                  closed={shouldClose}
                  onFailure={() => setFailed(true)}
                  onReady={() => setReady(true)}
                  pointer={pointerRef}
                  reducedMotion={reduceMotion}
                />
              </SceneBoundary>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
