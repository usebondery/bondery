/** File helpers for the `stack-secrets` Compose job. */

import { chmod, readFile, rename, writeFile } from "node:fs/promises";

export async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/** Write via a temporary file and rename, so a crash never leaves a half-written secret. */
export async function writeAtomic(path: string, contents: string, mode: number): Promise<void> {
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, contents, { mode });
  await chmod(temporaryPath, mode);
  await rename(temporaryPath, path);
}
