import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outputRoot = ".vercel/output";
const funcDir = join(outputRoot, "functions", "api.func");

mkdirSync(join(outputRoot, "static"), { recursive: true });
mkdirSync(funcDir, { recursive: true });

cpSync("dist", join(funcDir, "dist"), { recursive: true });

writeFileSync(
  join(funcDir, "index.js"),
  `export { default } from "./dist/index.js";\n`,
);

writeFileSync(
  join(funcDir, "package.json"),
  `${JSON.stringify({ type: "module" }, null, 2)}\n`,
);

writeFileSync(
  join(funcDir, ".vc-config.json"),
  `${JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.default",
      launcherType: "Nodejs",
      memory: 1024,
      maxDuration: 60,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(outputRoot, "config.json"),
  `${JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/api" },
      ],
    },
    null,
    2,
  )}\n`,
);
