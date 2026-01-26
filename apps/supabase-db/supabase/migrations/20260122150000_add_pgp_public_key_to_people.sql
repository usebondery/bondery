-- Add pgp_public_key column to people table for vCard KEY export
ALTER TABLE people
ADD COLUMN pgp_public_key TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN people.pgp_public_key IS 'PGP/GPG public key in ASCII-armored format for the contact';
