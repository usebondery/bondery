import { z } from "zod";
export declare const socialPlatformSchema: z.ZodEnum<{
    facebook: "facebook";
    instagram: "instagram";
    linkedin: "linkedin";
    whatsapp: "whatsapp";
    website: "website";
    signal: "signal";
}>;
export declare const socialHandleInputSchema: z.ZodObject<{
    platform: z.ZodEnum<{
        facebook: "facebook";
        instagram: "instagram";
        linkedin: "linkedin";
        whatsapp: "whatsapp";
        website: "website";
        signal: "signal";
    }>;
    value: z.ZodString;
}, z.core.$strip>;
export declare const socialHandleSchema: z.ZodPipe<z.ZodObject<{
    platform: z.ZodEnum<{
        facebook: "facebook";
        instagram: "instagram";
        linkedin: "linkedin";
        whatsapp: "whatsapp";
        website: "website";
        signal: "signal";
    }>;
    value: z.ZodString;
}, z.core.$strip>, z.ZodTransform<{
    platform: "facebook" | "instagram" | "linkedin" | "whatsapp" | "website" | "signal";
    value: string;
}, {
    platform: "facebook" | "instagram" | "linkedin" | "whatsapp" | "website" | "signal";
    value: string;
}>>;
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;
export type SocialHandleInput = z.input<typeof socialHandleSchema>;
export type SocialHandleOutput = z.output<typeof socialHandleSchema>;
