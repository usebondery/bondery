import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("api", { recursive: true });
copyFileSync("dist/index.js", "api/index.js");
