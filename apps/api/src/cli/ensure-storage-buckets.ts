import { ensureStorageBuckets } from "../lib/storage/ensure-buckets.js";

async function main(): Promise<void> {
  await ensureStorageBuckets();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
