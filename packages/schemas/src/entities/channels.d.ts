import { z } from "zod";
import { channelTypeSchema } from "../primitives/index.js";
export declare const phoneEntryEntitySchema: z.ZodObject<{
    prefix: z.ZodString;
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    preferred: z.ZodBoolean;
}, z.core.$strip>;
export declare const emailEntryEntitySchema: z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    preferred: z.ZodBoolean;
}, z.core.$strip>;
/** Mobile phone sheet — subset of phone fields; pick must run before refinements. */
export declare const phoneEntrySheetSchema: z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    prefix: z.ZodString;
}, z.core.$strip>;
/** Single phone row before PATCH /api/contacts/:id phones array. */
export declare const phoneEntryInputSchema: z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    prefix: z.ZodString;
    preferred: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const phoneEntrySchema: z.ZodPipe<z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    prefix: z.ZodString;
    preferred: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodTransform<{
    preferred: boolean;
    prefix: string;
    value: string;
    type: "home" | "work";
}, {
    value: string;
    type: "home" | "work";
    prefix: string;
    preferred?: boolean | undefined;
}>>;
/** Single email row before PATCH /api/contacts/:id emails array. */
export declare const emailEntryInputSchema: z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    preferred: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const emailEntrySchema: z.ZodPipe<z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    preferred: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodTransform<{
    preferred: boolean;
    value: string;
    type: "home" | "work";
}, {
    value: string;
    type: "home" | "work";
    preferred?: boolean | undefined;
}>>;
export declare const replacePhonesSchema: z.ZodArray<z.ZodPipe<z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    prefix: z.ZodString;
    preferred: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodTransform<{
    preferred: boolean;
    prefix: string;
    value: string;
    type: "home" | "work";
}, {
    value: string;
    type: "home" | "work";
    prefix: string;
    preferred?: boolean | undefined;
}>>>;
export declare const replaceEmailsSchema: z.ZodArray<z.ZodPipe<z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        home: "home";
        work: "work";
    }>;
    preferred: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodTransform<{
    preferred: boolean;
    value: string;
    type: "home" | "work";
}, {
    value: string;
    type: "home" | "work";
    preferred?: boolean | undefined;
}>>>;
export declare const shareContactEmailSchema: z.ZodObject<{
    recipients: z.ZodArray<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    message: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string | undefined, string>>>;
}, z.core.$strip>;
export type ContactType = z.infer<typeof channelTypeSchema>;
export type PhoneEntry = z.infer<typeof phoneEntryEntitySchema>;
export type EmailEntry = z.infer<typeof emailEntryEntitySchema>;
export type PhoneEntryInput = z.infer<typeof phoneEntrySchema>;
export type EmailEntryInput = z.infer<typeof emailEntrySchema>;
export type ShareContactEmailInput = z.infer<typeof shareContactEmailSchema>;
