/**
 * Fixture corpus accessors.
 *
 * The corpus belongs to this package. Consumers must not assemble a relative path to it: that is
 * how the API came to read a directory the production image never copied. Resolve through these
 * names instead, so the next move changes one file.
 */
import { fileURLToPath } from "node:url";

const LEADING_SLASHES = /^\/+/;
const TRAILING_SEPARATORS = /[\\/]+$/;

/** Absolute path of the committed corpus. */
export const FIXTURES_DIR = fileURLToPath(new URL("./sample-data/", import.meta.url));

/**
 * The sample Bondery export as one ZIP, ready for the import route.
 *
 * Committed rather than assembled from `bondery/export-files/`, so a production image that does
 * not carry the corpus can still provision a reviewer account.
 */
export const BONDERY_SAMPLE_EXPORT_ZIP = fileURLToPath(
  new URL("./sample-data/bondery/bondery-sample-export.zip", import.meta.url),
);

/**
 * Absolute path of one file or folder in the corpus.
 *
 * @param relativePath path inside the corpus, such as `google/contacts.vcf`
 * @returns absolute path, with no trailing slash
 */
export function fixturePath(relativePath) {
  const base = FIXTURES_DIR.replace(TRAILING_SEPARATORS, "");
  return fileURLToPath(new URL(relativePath.replace(LEADING_SLASHES, ""), `file://${base}/`));
}
