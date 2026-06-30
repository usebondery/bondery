import { z } from "zod";
export declare const colorSchemePreferenceSchema: z.ZodEnum<{
    light: "light";
    dark: "dark";
    auto: "auto";
}>;
export declare const timeFormatPreferenceSchema: z.ZodEnum<{
    "24h": "24h";
    "12h": "12h";
}>;
export declare const swipeActionPreferenceSchema: z.ZodEnum<{
    message: "message";
    email: "email";
    call: "call";
}>;
export declare const reminderSendHourSchema: z.ZodString;
export declare const groupSortOrderPreferenceSchema: z.ZodEnum<{
    "recent-opened": "recent-opened";
    "count-desc": "count-desc";
    "count-asc": "count-asc";
    "alpha-asc": "alpha-asc";
    "alpha-desc": "alpha-desc";
}>;
export declare const tagSortOrderPreferenceSchema: z.ZodEnum<{
    "count-desc": "count-desc";
    "count-asc": "count-asc";
    "alpha-asc": "alpha-asc";
    "alpha-desc": "alpha-desc";
}>;
export declare const userSettingsSchema: z.ZodObject<{
    avatarUrl: z.ZodNullable<z.ZodString>;
    onboardingCompletedAt: z.ZodNullable<z.ZodString>;
    created_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timezone: z.ZodNullable<z.ZodString>;
    reminderSendHour: z.ZodString;
    timeFormat: z.ZodEnum<{
        "24h": "24h";
        "12h": "12h";
    }>;
    language: z.ZodNullable<z.ZodString>;
    colorScheme: z.ZodEnum<{
        light: "light";
        dark: "dark";
        auto: "auto";
    }>;
    leftSwipeAction: z.ZodEnum<{
        message: "message";
        email: "email";
        call: "call";
    }>;
    rightSwipeAction: z.ZodEnum<{
        message: "message";
        email: "email";
        call: "call";
    }>;
    groupSortOrder: z.ZodEnum<{
        "recent-opened": "recent-opened";
        "count-desc": "count-desc";
        "count-asc": "count-asc";
        "alpha-asc": "alpha-asc";
        "alpha-desc": "alpha-desc";
    }>;
    tagSortOrder: z.ZodEnum<{
        "count-desc": "count-desc";
        "count-asc": "count-asc";
        "alpha-asc": "alpha-asc";
        "alpha-desc": "alpha-desc";
    }>;
    id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodString;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const updateUserSettingsInputSchema: z.ZodObject<{
    reminderSendHour: z.ZodOptional<z.ZodString>;
    timeFormat: z.ZodOptional<z.ZodEnum<{
        "24h": "24h";
        "12h": "12h";
    }>>;
    colorScheme: z.ZodOptional<z.ZodEnum<{
        light: "light";
        dark: "dark";
        auto: "auto";
    }>>;
    leftSwipeAction: z.ZodOptional<z.ZodEnum<{
        message: "message";
        email: "email";
        call: "call";
    }>>;
    rightSwipeAction: z.ZodOptional<z.ZodEnum<{
        message: "message";
        email: "email";
        call: "call";
    }>>;
    groupSortOrder: z.ZodOptional<z.ZodEnum<{
        "recent-opened": "recent-opened";
        "count-desc": "count-desc";
        "count-asc": "count-asc";
        "alpha-asc": "alpha-asc";
        "alpha-desc": "alpha-desc";
    }>>;
    tagSortOrder: z.ZodOptional<z.ZodEnum<{
        "count-desc": "count-desc";
        "count-asc": "count-asc";
        "alpha-asc": "alpha-asc";
        "alpha-desc": "alpha-desc";
    }>>;
    timezone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    language: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
/** Alias retained for naming consistency in docs/plans. */
export declare const updateUserSettingsSchema: z.ZodObject<{
    reminderSendHour: z.ZodOptional<z.ZodString>;
    timeFormat: z.ZodOptional<z.ZodEnum<{
        "24h": "24h";
        "12h": "12h";
    }>>;
    colorScheme: z.ZodOptional<z.ZodEnum<{
        light: "light";
        dark: "dark";
        auto: "auto";
    }>>;
    leftSwipeAction: z.ZodOptional<z.ZodEnum<{
        message: "message";
        email: "email";
        call: "call";
    }>>;
    rightSwipeAction: z.ZodOptional<z.ZodEnum<{
        message: "message";
        email: "email";
        call: "call";
    }>>;
    groupSortOrder: z.ZodOptional<z.ZodEnum<{
        "recent-opened": "recent-opened";
        "count-desc": "count-desc";
        "count-asc": "count-asc";
        "alpha-asc": "alpha-asc";
        "alpha-desc": "alpha-desc";
    }>>;
    tagSortOrder: z.ZodOptional<z.ZodEnum<{
        "count-desc": "count-desc";
        "count-asc": "count-asc";
        "alpha-asc": "alpha-asc";
        "alpha-desc": "alpha-desc";
    }>>;
    timezone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    language: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const userIdentitySchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    identity_id: z.ZodString;
    provider: z.ZodString;
}, z.core.$strip>;
export declare const userSettingsResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        avatarUrl: z.ZodNullable<z.ZodString>;
        onboardingCompletedAt: z.ZodNullable<z.ZodString>;
        created_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timezone: z.ZodNullable<z.ZodString>;
        reminderSendHour: z.ZodString;
        timeFormat: z.ZodEnum<{
            "24h": "24h";
            "12h": "12h";
        }>;
        language: z.ZodNullable<z.ZodString>;
        colorScheme: z.ZodEnum<{
            light: "light";
            dark: "dark";
            auto: "auto";
        }>;
        leftSwipeAction: z.ZodEnum<{
            message: "message";
            email: "email";
            call: "call";
        }>;
        rightSwipeAction: z.ZodEnum<{
            message: "message";
            email: "email";
            call: "call";
        }>;
        groupSortOrder: z.ZodEnum<{
            "recent-opened": "recent-opened";
            "count-desc": "count-desc";
            "count-asc": "count-asc";
            "alpha-asc": "alpha-asc";
            "alpha-desc": "alpha-desc";
        }>;
        tagSortOrder: z.ZodEnum<{
            "count-desc": "count-desc";
            "count-asc": "count-asc";
            "alpha-asc": "alpha-asc";
            "alpha-desc": "alpha-desc";
        }>;
        id: z.ZodOptional<z.ZodString>;
        user_id: z.ZodString;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodString>;
        providers: z.ZodOptional<z.ZodArray<z.ZodString>>;
        identities: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            user_id: z.ZodString;
            identity_id: z.ZodString;
            provider: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const authUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const userAccountResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        user_metadata: z.ZodObject<{
            name: z.ZodString;
            middlename: z.ZodString;
            surname: z.ZodString;
            avatar_url: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateAccountInputSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    middlename: z.ZodOptional<z.ZodString>;
    surname: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ColorSchemePreference = z.infer<typeof colorSchemePreferenceSchema>;
export type TimeFormatPreference = z.infer<typeof timeFormatPreferenceSchema>;
export type SwipeActionPreference = z.infer<typeof swipeActionPreferenceSchema>;
export type GroupSortOrderPreference = z.infer<typeof groupSortOrderPreferenceSchema>;
export type TagSortOrderPreference = z.infer<typeof tagSortOrderPreferenceSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserIdentity = z.infer<typeof userIdentitySchema>;
export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsInputSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type UserAccountResponse = z.infer<typeof userAccountResponseSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;
