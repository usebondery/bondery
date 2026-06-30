import { z } from "zod";
/** Shared channel enum used by phone/email entries. */
export declare const channelTypeSchema: z.ZodEnum<{
    home: "home";
    work: "work";
}>;
export type ChannelType = z.infer<typeof channelTypeSchema>;
