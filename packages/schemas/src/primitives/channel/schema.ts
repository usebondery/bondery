import { z } from "zod";
import type { ChannelType } from "./types.js";

/** Shared channel enum used by phone/email entries. */
export const channelTypeSchema = z
  .enum(["home", "work"])
  .describe("Channel category, such as home or work") satisfies z.ZodType<ChannelType>;
