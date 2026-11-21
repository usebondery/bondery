#!/usr/bin/env node
import { killDevPort } from "./kill-dev-port.mjs";

if (!killDevPort(26630)) {
  process.exitCode = 1;
}
