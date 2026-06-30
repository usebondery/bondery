import { z } from "zod";
/** Shared channel enum used by phone/email entries. */
export const channelTypeSchema = z.enum(["home", "work"]);
