import { z } from "zod";
import type { ChannelType } from "./types.js";

/** Shared channel enum used by phone/email entries. */
export const channelTypeSchema = z.enum(["home", "work"]) satisfies z.ZodType<ChannelType>;
