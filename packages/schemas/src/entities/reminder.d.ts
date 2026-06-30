import { z } from "zod";
export declare const upcomingReminderSchema: z.ZodObject<{
    importantDate: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        notifyOn: z.ZodNullable<z.ZodString>;
        type: z.ZodEnum<{
            birthday: "birthday";
            anniversary: "anniversary";
            nameday: "nameday";
            graduation: "graduation";
            other: "other";
        }>;
        date: z.ZodString;
        note: z.ZodNullable<z.ZodString>;
        notifyDaysBefore: z.ZodUnion<readonly [z.ZodLiteral<1>, z.ZodLiteral<3>, z.ZodLiteral<7>, z.ZodNull]>;
        personId: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    person: z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    notificationSent: z.ZodBoolean;
    notificationSentAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type UpcomingReminder = z.infer<typeof upcomingReminderSchema>;
