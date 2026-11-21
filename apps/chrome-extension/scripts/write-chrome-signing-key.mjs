import { writeFileSync } from "node:fs";

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error(
      "usage: node apps/chrome-extension/scripts/write-chrome-signing-key.mjs <pem-path>",
    );
    process.exitCode = 1;
    return;
  }

  let raw = process.env.PRIVATE_CHROME_PRIVATE_SIGNING_KEY ?? "";
  raw = raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  if (!raw.includes("-----BEGIN") && raw.includes("\\n")) {
    raw = raw.replaceAll("\\n", "\n");
  }
  if (!/^-----BEGIN [\w ]*PRIVATE KEY-----/m.test(raw)) {
    console.error("Signing key is not a PEM private key");
    process.exitCode = 1;
    return;
  }

  writeFileSync(out, raw.endsWith("\n") ? raw : `${raw}\n`);
}

main();
