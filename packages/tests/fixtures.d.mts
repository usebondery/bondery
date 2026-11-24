/** Absolute path of the committed corpus. */
export declare const FIXTURES_DIR: string;

/** The sample Bondery export as one ZIP, ready for the import route. */
export declare const BONDERY_SAMPLE_EXPORT_ZIP: string;

/**
 * Absolute path of one file or folder in the corpus.
 *
 * @param relativePath path inside the corpus, such as `google/contacts.vcf`
 * @returns absolute path, with no trailing slash
 */
export declare function fixturePath(relativePath: string): string;
