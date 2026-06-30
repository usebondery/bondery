import { z } from "zod";
export declare const scrapedWorkHistoryEntrySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    companyName: z.ZodString;
    companyLinkedinId: z.ZodOptional<z.ZodString>;
    companyLogoUrl: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    employmentType: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const scrapedEducationEntrySchema: z.ZodObject<{
    schoolName: z.ZodString;
    schoolLinkedinId: z.ZodOptional<z.ZodString>;
    schoolLogoUrl: z.ZodOptional<z.ZodString>;
    degree: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const redirectRequestSchema: z.ZodObject<{
    instagram: z.ZodOptional<z.ZodString>;
    linkedin: z.ZodOptional<z.ZodString>;
    facebook: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    middleName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    profileImageUrl: z.ZodOptional<z.ZodString>;
    headline: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    workHistory: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        companyName: z.ZodString;
        companyLinkedinId: z.ZodOptional<z.ZodString>;
        companyLogoUrl: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        employmentType: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    educationHistory: z.ZodOptional<z.ZodArray<z.ZodObject<{
        schoolName: z.ZodString;
        schoolLinkedinId: z.ZodOptional<z.ZodString>;
        schoolLogoUrl: z.ZodOptional<z.ZodString>;
        degree: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    linkedinBio: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const enrichContactRequestSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    middleName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    profileImageUrl: z.ZodOptional<z.ZodString>;
    headline: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    linkedinBio: z.ZodOptional<z.ZodString>;
    workHistory: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        companyName: z.ZodString;
        companyLinkedinId: z.ZodOptional<z.ZodString>;
        companyLogoUrl: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        employmentType: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    educationHistory: z.ZodOptional<z.ZodArray<z.ZodObject<{
        schoolName: z.ZodString;
        schoolLinkedinId: z.ZodOptional<z.ZodString>;
        schoolLogoUrl: z.ZodOptional<z.ZodString>;
        degree: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const redirectResponseSchema: z.ZodObject<{
    contactId: z.ZodString;
    existed: z.ZodBoolean;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const linkedInPreparedContactSchema: z.ZodObject<{
    tempId: z.ZodString;
    firstName: z.ZodString;
    middleName: z.ZodNullable<z.ZodString>;
    lastName: z.ZodString;
    linkedinUrl: z.ZodString;
    linkedinUsername: z.ZodString;
    alreadyExists: z.ZodBoolean;
    email: z.ZodNullable<z.ZodString>;
    company: z.ZodNullable<z.ZodString>;
    position: z.ZodNullable<z.ZodString>;
    connectedAt: z.ZodNullable<z.ZodString>;
    connectedOnRaw: z.ZodNullable<z.ZodString>;
    isValid: z.ZodBoolean;
    issues: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const linkedInParseResponseSchema: z.ZodObject<{
    contacts: z.ZodArray<z.ZodObject<{
        tempId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        linkedinUrl: z.ZodString;
        linkedinUsername: z.ZodString;
        alreadyExists: z.ZodBoolean;
        email: z.ZodNullable<z.ZodString>;
        company: z.ZodNullable<z.ZodString>;
        position: z.ZodNullable<z.ZodString>;
        connectedAt: z.ZodNullable<z.ZodString>;
        connectedOnRaw: z.ZodNullable<z.ZodString>;
        isValid: z.ZodBoolean;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    totalCount: z.ZodNumber;
    validCount: z.ZodNumber;
    invalidCount: z.ZodNumber;
}, z.core.$strip>;
export declare const linkedInImportCommitRequestSchema: z.ZodObject<{
    contacts: z.ZodArray<z.ZodObject<{
        tempId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        linkedinUrl: z.ZodString;
        linkedinUsername: z.ZodString;
        alreadyExists: z.ZodBoolean;
        email: z.ZodNullable<z.ZodString>;
        company: z.ZodNullable<z.ZodString>;
        position: z.ZodNullable<z.ZodString>;
        connectedAt: z.ZodNullable<z.ZodString>;
        connectedOnRaw: z.ZodNullable<z.ZodString>;
        isValid: z.ZodBoolean;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const linkedInImportCommitResponseSchema: z.ZodObject<{
    importedCount: z.ZodNumber;
    updatedCount: z.ZodNumber;
    skippedCount: z.ZodNumber;
}, z.core.$strip>;
export declare const instagramImportStrategySchema: z.ZodEnum<{
    close_friends: "close_friends";
    following: "following";
    followers: "followers";
    following_and_followers: "following_and_followers";
    mutual_following: "mutual_following";
}>;
export declare const instagramImportSourceSchema: z.ZodEnum<{
    close_friends: "close_friends";
    following: "following";
    followers: "followers";
}>;
export declare const instagramPreparedContactSchema: z.ZodObject<{
    tempId: z.ZodString;
    firstName: z.ZodString;
    middleName: z.ZodNullable<z.ZodString>;
    lastName: z.ZodString;
    instagramUrl: z.ZodString;
    instagramUsername: z.ZodString;
    alreadyExists: z.ZodBoolean;
    likelyPerson: z.ZodBoolean;
    connectedAt: z.ZodNullable<z.ZodString>;
    connectedOnRaw: z.ZodNullable<z.ZodNumber>;
    sources: z.ZodArray<z.ZodEnum<{
        close_friends: "close_friends";
        following: "following";
        followers: "followers";
    }>>;
    isValid: z.ZodBoolean;
    issues: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const instagramParseResponseSchema: z.ZodObject<{
    contacts: z.ZodArray<z.ZodObject<{
        tempId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        instagramUrl: z.ZodString;
        instagramUsername: z.ZodString;
        alreadyExists: z.ZodBoolean;
        likelyPerson: z.ZodBoolean;
        connectedAt: z.ZodNullable<z.ZodString>;
        connectedOnRaw: z.ZodNullable<z.ZodNumber>;
        sources: z.ZodArray<z.ZodEnum<{
            close_friends: "close_friends";
            following: "following";
            followers: "followers";
        }>>;
        isValid: z.ZodBoolean;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    totalCount: z.ZodNumber;
    validCount: z.ZodNumber;
    invalidCount: z.ZodNumber;
}, z.core.$strip>;
export declare const instagramImportCommitRequestSchema: z.ZodObject<{
    contacts: z.ZodArray<z.ZodObject<{
        tempId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        instagramUrl: z.ZodString;
        instagramUsername: z.ZodString;
        alreadyExists: z.ZodBoolean;
        likelyPerson: z.ZodBoolean;
        connectedAt: z.ZodNullable<z.ZodString>;
        connectedOnRaw: z.ZodNullable<z.ZodNumber>;
        sources: z.ZodArray<z.ZodEnum<{
            close_friends: "close_friends";
            following: "following";
            followers: "followers";
        }>>;
        isValid: z.ZodBoolean;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const instagramImportCommitResponseSchema: z.ZodObject<{
    importedCount: z.ZodNumber;
    updatedCount: z.ZodNumber;
    skippedCount: z.ZodNumber;
}, z.core.$strip>;
export declare const vcardPreparedContactSchema: z.ZodObject<{
    tempId: z.ZodString;
    firstName: z.ZodString;
    middleName: z.ZodNullable<z.ZodString>;
    lastName: z.ZodString;
    headline: z.ZodNullable<z.ZodString>;
    phones: z.ZodArray<z.ZodObject<{
        prefix: z.ZodString;
        value: z.ZodString;
        type: z.ZodEnum<{
            home: "home";
            work: "work";
        }>;
        preferred: z.ZodBoolean;
    }, z.core.$strip>>;
    emails: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        type: z.ZodEnum<{
            home: "home";
            work: "work";
        }>;
        preferred: z.ZodBoolean;
    }, z.core.$strip>>;
    addresses: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        type: z.ZodEnum<{
            other: "other";
            home: "home";
            work: "work";
        }>;
        preferred: z.ZodBoolean;
        addressLine1: z.ZodNullable<z.ZodString>;
        addressLine2: z.ZodNullable<z.ZodString>;
        addressCity: z.ZodNullable<z.ZodString>;
        addressPostalCode: z.ZodNullable<z.ZodString>;
        addressState: z.ZodNullable<z.ZodString>;
        addressStateCode: z.ZodNullable<z.ZodString>;
        addressCountry: z.ZodNullable<z.ZodString>;
        addressCountryCode: z.ZodNullable<z.ZodString>;
        addressFormatted: z.ZodNullable<z.ZodString>;
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
        geocodeSource: z.ZodNullable<z.ZodLiteral<"mapy.com">>;
        validity: z.ZodEnum<{
            unverifiable: "unverifiable";
            valid: "valid";
            invalid: "invalid";
        }>;
        timezone: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    linkedin: z.ZodNullable<z.ZodString>;
    instagram: z.ZodNullable<z.ZodString>;
    whatsapp: z.ZodNullable<z.ZodString>;
    facebook: z.ZodNullable<z.ZodString>;
    signal: z.ZodNullable<z.ZodString>;
    website: z.ZodNullable<z.ZodString>;
    avatarUri: z.ZodNullable<z.ZodString>;
    importantDates: z.ZodNullable<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            birthday: "birthday";
            anniversary: "anniversary";
            nameday: "nameday";
            graduation: "graduation";
            other: "other";
        }>;
        date: z.ZodString;
        note: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>>;
    isValid: z.ZodBoolean;
    issues: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const vcardParseResponseSchema: z.ZodObject<{
    contacts: z.ZodArray<z.ZodObject<{
        tempId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        headline: z.ZodNullable<z.ZodString>;
        phones: z.ZodArray<z.ZodObject<{
            prefix: z.ZodString;
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>;
        emails: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>;
        addresses: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                other: "other";
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
            addressLine1: z.ZodNullable<z.ZodString>;
            addressLine2: z.ZodNullable<z.ZodString>;
            addressCity: z.ZodNullable<z.ZodString>;
            addressPostalCode: z.ZodNullable<z.ZodString>;
            addressState: z.ZodNullable<z.ZodString>;
            addressStateCode: z.ZodNullable<z.ZodString>;
            addressCountry: z.ZodNullable<z.ZodString>;
            addressCountryCode: z.ZodNullable<z.ZodString>;
            addressFormatted: z.ZodNullable<z.ZodString>;
            latitude: z.ZodNullable<z.ZodNumber>;
            longitude: z.ZodNullable<z.ZodNumber>;
            geocodeSource: z.ZodNullable<z.ZodLiteral<"mapy.com">>;
            validity: z.ZodEnum<{
                unverifiable: "unverifiable";
                valid: "valid";
                invalid: "invalid";
            }>;
            timezone: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        linkedin: z.ZodNullable<z.ZodString>;
        instagram: z.ZodNullable<z.ZodString>;
        whatsapp: z.ZodNullable<z.ZodString>;
        facebook: z.ZodNullable<z.ZodString>;
        signal: z.ZodNullable<z.ZodString>;
        website: z.ZodNullable<z.ZodString>;
        avatarUri: z.ZodNullable<z.ZodString>;
        importantDates: z.ZodNullable<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<{
                birthday: "birthday";
                anniversary: "anniversary";
                nameday: "nameday";
                graduation: "graduation";
                other: "other";
            }>;
            date: z.ZodString;
            note: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>>;
        isValid: z.ZodBoolean;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    totalCount: z.ZodNumber;
    validCount: z.ZodNumber;
    invalidCount: z.ZodNumber;
}, z.core.$strip>;
export declare const vcardImportCommitRequestSchema: z.ZodObject<{
    contacts: z.ZodArray<z.ZodObject<{
        tempId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodString;
        headline: z.ZodNullable<z.ZodString>;
        phones: z.ZodArray<z.ZodObject<{
            prefix: z.ZodString;
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>;
        emails: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>;
        addresses: z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                other: "other";
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
            addressLine1: z.ZodNullable<z.ZodString>;
            addressLine2: z.ZodNullable<z.ZodString>;
            addressCity: z.ZodNullable<z.ZodString>;
            addressPostalCode: z.ZodNullable<z.ZodString>;
            addressState: z.ZodNullable<z.ZodString>;
            addressStateCode: z.ZodNullable<z.ZodString>;
            addressCountry: z.ZodNullable<z.ZodString>;
            addressCountryCode: z.ZodNullable<z.ZodString>;
            addressFormatted: z.ZodNullable<z.ZodString>;
            latitude: z.ZodNullable<z.ZodNumber>;
            longitude: z.ZodNullable<z.ZodNumber>;
            geocodeSource: z.ZodNullable<z.ZodLiteral<"mapy.com">>;
            validity: z.ZodEnum<{
                unverifiable: "unverifiable";
                valid: "valid";
                invalid: "invalid";
            }>;
            timezone: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        linkedin: z.ZodNullable<z.ZodString>;
        instagram: z.ZodNullable<z.ZodString>;
        whatsapp: z.ZodNullable<z.ZodString>;
        facebook: z.ZodNullable<z.ZodString>;
        signal: z.ZodNullable<z.ZodString>;
        website: z.ZodNullable<z.ZodString>;
        avatarUri: z.ZodNullable<z.ZodString>;
        importantDates: z.ZodNullable<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<{
                birthday: "birthday";
                anniversary: "anniversary";
                nameday: "nameday";
                graduation: "graduation";
                other: "other";
            }>;
            date: z.ZodString;
            note: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>>;
        isValid: z.ZodBoolean;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const vcardImportCommitResponseSchema: z.ZodObject<{
    importedCount: z.ZodNumber;
    skippedCount: z.ZodNumber;
}, z.core.$strip>;
export type ScrapedWorkHistoryEntry = z.infer<typeof scrapedWorkHistoryEntrySchema>;
export type ScrapedEducationEntry = z.infer<typeof scrapedEducationEntrySchema>;
export type RedirectRequest = z.infer<typeof redirectRequestSchema>;
export type EnrichContactRequest = z.infer<typeof enrichContactRequestSchema>;
export type RedirectResponse = z.infer<typeof redirectResponseSchema>;
export type LinkedInPreparedContact = z.infer<typeof linkedInPreparedContactSchema>;
export type LinkedInParseResponse = z.infer<typeof linkedInParseResponseSchema>;
export type LinkedInImportCommitRequest = z.infer<typeof linkedInImportCommitRequestSchema>;
export type LinkedInImportCommitResponse = z.infer<typeof linkedInImportCommitResponseSchema>;
export type InstagramImportStrategy = z.infer<typeof instagramImportStrategySchema>;
export type InstagramImportSource = z.infer<typeof instagramImportSourceSchema>;
export type InstagramPreparedContact = z.infer<typeof instagramPreparedContactSchema>;
export type InstagramParseResponse = z.infer<typeof instagramParseResponseSchema>;
export type InstagramImportCommitRequest = z.infer<typeof instagramImportCommitRequestSchema>;
export type InstagramImportCommitResponse = z.infer<typeof instagramImportCommitResponseSchema>;
export type VCardPreparedContact = z.infer<typeof vcardPreparedContactSchema>;
export type VCardParseResponse = z.infer<typeof vcardParseResponseSchema>;
export type VCardImportCommitRequest = z.infer<typeof vcardImportCommitRequestSchema>;
export type VCardImportCommitResponse = z.infer<typeof vcardImportCommitResponseSchema>;
