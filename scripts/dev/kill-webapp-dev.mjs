#!/usr/bin/env node
import { killDevPort } from "./kill-dev-port.mjs";

if (!killDevPort(26632)) {
  process.exitCode = 1;
}
