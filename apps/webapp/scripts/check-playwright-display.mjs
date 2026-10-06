#!/usr/bin/env node
import { ensureWslgDisplay } from "./ensure-wslg-display.mjs";

function hasDisplay() {
  if (process.platform !== "linux") {
    return true;
  }

  ensureWslgDisplay();

  return Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

if (!hasDisplay()) {
  console.error(`
Headed Playwright cannot open a browser: no display server (Missing X server / $DISPLAY).

Manual GitHub login requires a visible browser. On WSL, use one of:

  1. Windows 11 WSLg (recommended)
     - Update WSL: wsl --update
     - Restart WSL, then run auth-setup from the same WSL terminal (not SSH).
     - If /tmp/.X11-unix/X0 exists but tests still fail, run:
       export DISPLAY=:0

  2. Windows X server (VcXsrv / X410)
     - Start the X server on Windows, then in WSL:
       export DISPLAY=$(grep -m1 nameserver /etc/resolv.conf | awk '{print $2}'):0

  3. Run Playwright from Windows (PowerShell / cmd) in this repo
     - Node must be installed on Windows, not only inside WSL.

Unauthenticated e2e (no browser UI) works headless:
  pnpm run test:e2e -w webapp -- --project=unauth
`);
  process.exit(1);
}

if (process.env.DISPLAY === ":0") {
  console.log("Using DISPLAY=:0 (WSLg)");
}
