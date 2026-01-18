import type { Contact as ContactType } from "@bondery/types";

/**
 * Re-export Contact type from @bondery/types for local usage.
 * This maintains backward compatibility with existing code that imports from this file.
 */
export type Contact = ContactType;
