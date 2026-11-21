import { runReleaseMigrate } from "@bondery/db/release-migrate";
import { provisionOAuthClients } from "../lib/bootstrap/provision-oauth-clients.js";
import { provisionPlatformAdmins } from "../lib/bootstrap/provision-platform-admins.js";

async function main(): Promise<void> {
  await runReleaseMigrate({
    provisionOAuthClients,
    provisionPlatformAdmins,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
