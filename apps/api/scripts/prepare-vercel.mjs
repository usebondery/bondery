import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

mkdirSync("api", { recursive: true });
mkdirSync("public", { recursive: true });
// Vercel (and Turbo defaults) expect a static outputDirectory; API is functions-only.
writeFileSync("public/.gitkeep", "", "utf-8");
copyFileSync("dist/index.js", "api/index.js");
