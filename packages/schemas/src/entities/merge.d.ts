import { z } from "zod";
export declare const mergeConflictChoiceSchema: z.ZodEnum<{
    left: "left";
    right: "right";
}>;
export declare const mergeConflictFieldSchema: z.ZodEnum<{
    middleName: "middleName";
    lastName: "lastName";
    firstName: "firstName";
    facebook: "facebook";
    instagram: "instagram";
    language: "language";
    avatar: "avatar";
    latitude: "latitude";
    longitude: "longitude";
    timezone: "timezone";
    headline: "headline";
    location: "location";
    notes: "notes";
    lastInteraction: "lastInteraction";
    phones: "phones";
    emails: "emails";
    linkedin: "linkedin";
    whatsapp: "whatsapp";
    website: "website";
    signal: "signal";
    importantDates: "importantDates";
    gisPoint: "gisPoint";
}>;
export declare const mergeRecommendationReasonSchema: z.ZodEnum<{
    email: "email";
    fullName: "fullName";
    phone: "phone";
}>;
export declare const mergeRecommendationSchema: z.ZodObject<{
    id: z.ZodString;
    leftPerson: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        headline: z.ZodNullable<z.ZodString>;
        location: z.ZodNullable<z.ZodString>;
        notes: z.ZodNullable<z.ZodString>;
        notesUpdatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        avatar: z.ZodNullable<z.ZodString>;
        lastInteraction: z.ZodNullable<z.ZodString>;
        lastInteractionActivityId: z.ZodNullable<z.ZodString>;
        keepFrequencyDays: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodString;
        updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phones: z.ZodNullable<z.ZodArray<z.ZodObject<{
            prefix: z.ZodString;
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>>;
        emails: z.ZodNullable<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>>;
        addresses: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                other: "other";
                home: "home";
                work: "work";
            }>;
            label: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            latitude: z.ZodNullable<z.ZodNumber>;
            longitude: z.ZodNullable<z.ZodNumber>;
            addressLine1: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressLine2: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCity: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressPostalCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressState: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressStateCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCountry: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCountryCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressGranularity: z.ZodEnum<{
                city: "city";
                address: "address";
                state: "state";
                country: "country";
            }>;
            addressFormatted: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressGeocodeSource: z.ZodNullable<z.ZodEnum<{
                "mapy.com": "mapy.com";
                manual: "manual";
            }>>;
            geocodeConfidence: z.ZodNullable<z.ZodEnum<{
                verified: "verified";
                unverifiable: "unverifiable";
            }>>;
            timezone: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
        }, z.core.$strip>>>>;
        linkedin: z.ZodNullable<z.ZodString>;
        instagram: z.ZodNullable<z.ZodString>;
        whatsapp: z.ZodNullable<z.ZodString>;
        facebook: z.ZodNullable<z.ZodString>;
        website: z.ZodNullable<z.ZodString>;
        signal: z.ZodNullable<z.ZodString>;
        importantDates: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
        }, z.core.$strip>>>>;
        myself: z.ZodNullable<z.ZodBoolean>;
        position: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
        language: z.ZodNullable<z.ZodString>;
        timezone: z.ZodNullable<z.ZodString>;
        gisPoint: z.ZodNullable<z.ZodString>;
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
    rightPerson: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        headline: z.ZodNullable<z.ZodString>;
        location: z.ZodNullable<z.ZodString>;
        notes: z.ZodNullable<z.ZodString>;
        notesUpdatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        avatar: z.ZodNullable<z.ZodString>;
        lastInteraction: z.ZodNullable<z.ZodString>;
        lastInteractionActivityId: z.ZodNullable<z.ZodString>;
        keepFrequencyDays: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodString;
        updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phones: z.ZodNullable<z.ZodArray<z.ZodObject<{
            prefix: z.ZodString;
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>>;
        emails: z.ZodNullable<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>>;
        addresses: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                other: "other";
                home: "home";
                work: "work";
            }>;
            label: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            latitude: z.ZodNullable<z.ZodNumber>;
            longitude: z.ZodNullable<z.ZodNumber>;
            addressLine1: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressLine2: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCity: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressPostalCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressState: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressStateCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCountry: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCountryCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressGranularity: z.ZodEnum<{
                city: "city";
                address: "address";
                state: "state";
                country: "country";
            }>;
            addressFormatted: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressGeocodeSource: z.ZodNullable<z.ZodEnum<{
                "mapy.com": "mapy.com";
                manual: "manual";
            }>>;
            geocodeConfidence: z.ZodNullable<z.ZodEnum<{
                verified: "verified";
                unverifiable: "unverifiable";
            }>>;
            timezone: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
        }, z.core.$strip>>>>;
        linkedin: z.ZodNullable<z.ZodString>;
        instagram: z.ZodNullable<z.ZodString>;
        whatsapp: z.ZodNullable<z.ZodString>;
        facebook: z.ZodNullable<z.ZodString>;
        website: z.ZodNullable<z.ZodString>;
        signal: z.ZodNullable<z.ZodString>;
        importantDates: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
        }, z.core.$strip>>>>;
        myself: z.ZodNullable<z.ZodBoolean>;
        position: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
        language: z.ZodNullable<z.ZodString>;
        timezone: z.ZodNullable<z.ZodString>;
        gisPoint: z.ZodNullable<z.ZodString>;
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
    score: z.ZodNumber;
    reasons: z.ZodArray<z.ZodEnum<{
        email: "email";
        fullName: "fullName";
        phone: "phone";
    }>>;
}, z.core.$strip>;
export declare const mergeContactsRequestSchema: z.ZodObject<{
    leftPersonId: z.ZodString;
    rightPersonId: z.ZodString;
    conflictResolutions: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
        middleName: "middleName";
        lastName: "lastName";
        firstName: "firstName";
        facebook: "facebook";
        instagram: "instagram";
        language: "language";
        avatar: "avatar";
        latitude: "latitude";
        longitude: "longitude";
        timezone: "timezone";
        headline: "headline";
        location: "location";
        notes: "notes";
        lastInteraction: "lastInteraction";
        phones: "phones";
        emails: "emails";
        linkedin: "linkedin";
        whatsapp: "whatsapp";
        website: "website";
        signal: "signal";
        importantDates: "importantDates";
        gisPoint: "gisPoint";
    }> & z.core.$partial, z.ZodEnum<{
        left: "left";
        right: "right";
    }>>>;
}, z.core.$strip>;
export declare const mergeContactsResponseSchema: z.ZodObject<{
    personId: z.ZodString;
    userId: z.ZodString;
    mergedIntoPersonId: z.ZodString;
    mergedFromPersonId: z.ZodString;
    contact: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        firstName: z.ZodString;
        middleName: z.ZodNullable<z.ZodString>;
        lastName: z.ZodNullable<z.ZodString>;
        headline: z.ZodNullable<z.ZodString>;
        location: z.ZodNullable<z.ZodString>;
        notes: z.ZodNullable<z.ZodString>;
        notesUpdatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        avatar: z.ZodNullable<z.ZodString>;
        lastInteraction: z.ZodNullable<z.ZodString>;
        lastInteractionActivityId: z.ZodNullable<z.ZodString>;
        keepFrequencyDays: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodString;
        updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phones: z.ZodNullable<z.ZodArray<z.ZodObject<{
            prefix: z.ZodString;
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>>;
        emails: z.ZodNullable<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                home: "home";
                work: "work";
            }>;
            preferred: z.ZodBoolean;
        }, z.core.$strip>>>;
        addresses: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            type: z.ZodEnum<{
                other: "other";
                home: "home";
                work: "work";
            }>;
            label: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            latitude: z.ZodNullable<z.ZodNumber>;
            longitude: z.ZodNullable<z.ZodNumber>;
            addressLine1: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressLine2: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCity: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressPostalCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressState: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressStateCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCountry: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressCountryCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressGranularity: z.ZodEnum<{
                city: "city";
                address: "address";
                state: "state";
                country: "country";
            }>;
            addressFormatted: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            addressGeocodeSource: z.ZodNullable<z.ZodEnum<{
                "mapy.com": "mapy.com";
                manual: "manual";
            }>>;
            geocodeConfidence: z.ZodNullable<z.ZodEnum<{
                verified: "verified";
                unverifiable: "unverifiable";
            }>>;
            timezone: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
        }, z.core.$strip>>>>;
        linkedin: z.ZodNullable<z.ZodString>;
        instagram: z.ZodNullable<z.ZodString>;
        whatsapp: z.ZodNullable<z.ZodString>;
        facebook: z.ZodNullable<z.ZodString>;
        website: z.ZodNullable<z.ZodString>;
        signal: z.ZodNullable<z.ZodString>;
        importantDates: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
        }, z.core.$strip>>>>;
        myself: z.ZodNullable<z.ZodBoolean>;
        position: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
        language: z.ZodNullable<z.ZodString>;
        timezone: z.ZodNullable<z.ZodString>;
        gisPoint: z.ZodNullable<z.ZodString>;
        latitude: z.ZodNullable<z.ZodNumber>;
        longitude: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const mergeRecommendationsResponseSchema: z.ZodObject<{
    recommendations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        leftPerson: z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            firstName: z.ZodString;
            middleName: z.ZodNullable<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            headline: z.ZodNullable<z.ZodString>;
            location: z.ZodNullable<z.ZodString>;
            notes: z.ZodNullable<z.ZodString>;
            notesUpdatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            avatar: z.ZodNullable<z.ZodString>;
            lastInteraction: z.ZodNullable<z.ZodString>;
            lastInteractionActivityId: z.ZodNullable<z.ZodString>;
            keepFrequencyDays: z.ZodNullable<z.ZodNumber>;
            createdAt: z.ZodString;
            updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            phones: z.ZodNullable<z.ZodArray<z.ZodObject<{
                prefix: z.ZodString;
                value: z.ZodString;
                type: z.ZodEnum<{
                    home: "home";
                    work: "work";
                }>;
                preferred: z.ZodBoolean;
            }, z.core.$strip>>>;
            emails: z.ZodNullable<z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                type: z.ZodEnum<{
                    home: "home";
                    work: "work";
                }>;
                preferred: z.ZodBoolean;
            }, z.core.$strip>>>;
            addresses: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                type: z.ZodEnum<{
                    other: "other";
                    home: "home";
                    work: "work";
                }>;
                label: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                latitude: z.ZodNullable<z.ZodNumber>;
                longitude: z.ZodNullable<z.ZodNumber>;
                addressLine1: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressLine2: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressCity: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressPostalCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressState: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressStateCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressCountry: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressCountryCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressGranularity: z.ZodEnum<{
                    city: "city";
                    address: "address";
                    state: "state";
                    country: "country";
                }>;
                addressFormatted: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressGeocodeSource: z.ZodNullable<z.ZodEnum<{
                    "mapy.com": "mapy.com";
                    manual: "manual";
                }>>;
                geocodeConfidence: z.ZodNullable<z.ZodEnum<{
                    verified: "verified";
                    unverifiable: "unverifiable";
                }>>;
                timezone: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            }, z.core.$strip>>>>;
            linkedin: z.ZodNullable<z.ZodString>;
            instagram: z.ZodNullable<z.ZodString>;
            whatsapp: z.ZodNullable<z.ZodString>;
            facebook: z.ZodNullable<z.ZodString>;
            website: z.ZodNullable<z.ZodString>;
            signal: z.ZodNullable<z.ZodString>;
            importantDates: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
            }, z.core.$strip>>>>;
            myself: z.ZodNullable<z.ZodBoolean>;
            position: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
            language: z.ZodNullable<z.ZodString>;
            timezone: z.ZodNullable<z.ZodString>;
            gisPoint: z.ZodNullable<z.ZodString>;
            latitude: z.ZodNullable<z.ZodNumber>;
            longitude: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>;
        rightPerson: z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            firstName: z.ZodString;
            middleName: z.ZodNullable<z.ZodString>;
            lastName: z.ZodNullable<z.ZodString>;
            headline: z.ZodNullable<z.ZodString>;
            location: z.ZodNullable<z.ZodString>;
            notes: z.ZodNullable<z.ZodString>;
            notesUpdatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            avatar: z.ZodNullable<z.ZodString>;
            lastInteraction: z.ZodNullable<z.ZodString>;
            lastInteractionActivityId: z.ZodNullable<z.ZodString>;
            keepFrequencyDays: z.ZodNullable<z.ZodNumber>;
            createdAt: z.ZodString;
            updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            phones: z.ZodNullable<z.ZodArray<z.ZodObject<{
                prefix: z.ZodString;
                value: z.ZodString;
                type: z.ZodEnum<{
                    home: "home";
                    work: "work";
                }>;
                preferred: z.ZodBoolean;
            }, z.core.$strip>>>;
            emails: z.ZodNullable<z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                type: z.ZodEnum<{
                    home: "home";
                    work: "work";
                }>;
                preferred: z.ZodBoolean;
            }, z.core.$strip>>>;
            addresses: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                type: z.ZodEnum<{
                    other: "other";
                    home: "home";
                    work: "work";
                }>;
                label: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                latitude: z.ZodNullable<z.ZodNumber>;
                longitude: z.ZodNullable<z.ZodNumber>;
                addressLine1: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressLine2: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressCity: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressPostalCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressState: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressStateCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressCountry: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressCountryCode: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressGranularity: z.ZodEnum<{
                    city: "city";
                    address: "address";
                    state: "state";
                    country: "country";
                }>;
                addressFormatted: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
                addressGeocodeSource: z.ZodNullable<z.ZodEnum<{
                    "mapy.com": "mapy.com";
                    manual: "manual";
                }>>;
                geocodeConfidence: z.ZodNullable<z.ZodEnum<{
                    verified: "verified";
                    unverifiable: "unverifiable";
                }>>;
                timezone: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
            }, z.core.$strip>>>>;
            linkedin: z.ZodNullable<z.ZodString>;
            instagram: z.ZodNullable<z.ZodString>;
            whatsapp: z.ZodNullable<z.ZodString>;
            facebook: z.ZodNullable<z.ZodString>;
            website: z.ZodNullable<z.ZodString>;
            signal: z.ZodNullable<z.ZodString>;
            importantDates: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
            }, z.core.$strip>>>>;
            myself: z.ZodNullable<z.ZodBoolean>;
            position: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
            language: z.ZodNullable<z.ZodString>;
            timezone: z.ZodNullable<z.ZodString>;
            gisPoint: z.ZodNullable<z.ZodString>;
            latitude: z.ZodNullable<z.ZodNumber>;
            longitude: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>;
        score: z.ZodNumber;
        reasons: z.ZodArray<z.ZodEnum<{
            email: "email";
            fullName: "fullName";
            phone: "phone";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const declineMergeRecommendationResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
}, z.core.$strip>;
export declare const refreshMergeRecommendationsResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    recommendationsCount: z.ZodNumber;
}, z.core.$strip>;
export type MergeConflictChoice = z.infer<typeof mergeConflictChoiceSchema>;
export type MergeConflictField = z.infer<typeof mergeConflictFieldSchema>;
export type MergeRecommendationReason = z.infer<typeof mergeRecommendationReasonSchema>;
export type MergeRecommendation = z.infer<typeof mergeRecommendationSchema>;
export type MergeContactsRequest = z.infer<typeof mergeContactsRequestSchema>;
export type MergeContactsResponse = z.infer<typeof mergeContactsResponseSchema>;
export type MergeRecommendationsResponse = z.infer<typeof mergeRecommendationsResponseSchema>;
export type DeclineMergeRecommendationResponse = z.infer<typeof declineMergeRecommendationResponseSchema>;
export type RefreshMergeRecommendationsResponse = z.infer<typeof refreshMergeRecommendationsResponseSchema>;
