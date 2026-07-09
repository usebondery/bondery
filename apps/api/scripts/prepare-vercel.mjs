import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outputRoot = ".vercel/output";
const funcDir = join(outputRoot, "functions", "api.func");

mkdirSync(join(outputRoot, "static"), { recursive: true });
mkdirSync(funcDir, { recursive: true });

cpSync("dist", join(funcDir, "dist"), { recursive: true });

writeFileSync(join(funcDir, "index.js"), `export { default } from "./dist/index.js";\n`);

writeFileSync(join(funcDir, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`);

writeFileSync(
  join(funcDir, ".vc-config.json"),
  `${JSON.stringify(
    {
      handler: "index.default",
      launcherType: "Nodejs",
      maxDuration: 60,
      memory: 1024,
      runtime: "nodejs22.x",
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(outputRoot, "config.json"),
  `${JSON.stringify(
    {
      routes: [{ handle: "filesystem" }, { dest: "/api", src: "/(.*)" }],
      version: 3,
    },
    null,
    2,
  )}\n`,
);
