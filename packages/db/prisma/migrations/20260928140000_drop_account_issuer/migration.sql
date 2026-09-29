-- Better Auth 1.7.3+ reverted account identity to (provider_id, account_id).
DROP INDEX IF EXISTS "account_issuer_account_id_key";
ALTER TABLE "account" DROP COLUMN "issuer";
