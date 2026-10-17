#!/usr/bin/env node
/**
 * If JAVA_HOME is missing, stale, or not JDK 17, pick a Microsoft JDK 17
 * or Android Studio JBR, then run the remaining args.
 * Gradle native builds fail before install when JAVA_HOME is wrong.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const isWindows = process.platform === "win32";
const javaBin = isWindows ? "java.exe" : "java";
const REQUIRED_JAVA_MAJOR = 17;

function javaMajorVersion(home) {
  const releasePath = join(home, "release");
  if (!existsSync(releasePath)) {
    return null;
  }
  const match = readFileSync(releasePath, "utf8").match(/JAVA_VERSION="(\d+)/);
  return match ? Number(match[1]) : null;
}

function javaHomeIsUsable(home) {
  if (!home || !existsSync(join(home, "bin", javaBin))) {
    return false;
  }
  return javaMajorVersion(home) === REQUIRED_JAVA_MAJOR;
}

function microsoftJdk17Homes() {
  const root = "C:\\Program Files\\Microsoft";
  if (!isWindows || !existsSync(root)) {
    return [];
  }
  return readdirSync(root)
    .filter((name) => name.startsWith("jdk-17"))
    .map((name) => join(root, name))
    .toSorted((a, b) => b.localeCompare(a));
}

function resolveJavaHome() {
  if (javaHomeIsUsable(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }
  const candidates = [
    ...microsoftJdk17Homes(),
    "C:\\Program Files\\Android\\Android Studio\\jbr",
    "C:\\Program Files\\Android\\Android Studio\\jre",
  ];
  return candidates.find((home) => javaHomeIsUsable(home)) ?? null;
}

function quoteArg(value) {
  if (!/[\s"]/.test(value)) {
    return value;
  }
  return `"${value.replaceAll('"', '\\"')}"`;
}

function describeJava(home) {
  const probe = spawnSync(join(home, "bin", javaBin), ["-version"], {
    encoding: "utf8",
  });
  const text = `${probe.stderr ?? ""}${probe.stdout ?? ""}`;
  return text.split(/\r?\n/).find(Boolean) ?? `JDK ${javaMajorVersion(home)}`;
}

const previousHome = process.env.JAVA_HOME ?? "";
const resolved = resolveJavaHome();
if (!resolved) {
  console.error(
    "ensure-java-home: JAVA_HOME is missing or not JDK 17, and no JDK 17 or Android Studio JBR was found.",
  );
  process.exit(1);
}

if (resolved !== previousHome) {
  const previousLabel = previousHome || "(unset)";
  console.warn(`ensure-java-home: JAVA_HOME=${previousLabel} is missing, stale, or not JDK 17.`);
  process.env.JAVA_HOME = resolved;
  const pathSep = isWindows ? ";" : ":";
  process.env.PATH = `${join(resolved, "bin")}${pathSep}${process.env.PATH ?? ""}`;
}

console.warn(`ensure-java-home: ${describeJava(resolved)} (${resolved})`);

const args = process.argv.slice(2);
if (args.length === 0) {
  process.exit(0);
}

const child = isWindows
  ? spawn(args.map(quoteArg).join(" "), {
      env: process.env,
      shell: true,
      stdio: "inherit",
    })
  : spawn(args[0], args.slice(1), {
      env: process.env,
      stdio: "inherit",
    });
child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
