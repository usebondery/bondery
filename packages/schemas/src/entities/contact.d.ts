import { z } from "zod";
export declare const relationshipTypeSchema: z.ZodEnum<{
    other: "other";
    parent: "parent";
    child: "child";
    spouse: "spouse";
    partner: "partner";
    sibling: "sibling";
    friend: "friend";
    colleague: "colleague";
    neighbor: "neighbor";
    guardian: "guardian";
    dependent: "dependent";
}>;
export declare const contactSchema: z.ZodObject<{
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
export declare const contactPreviewSchema: z.ZodObject<{
    lastName: z.ZodNullable<z.ZodString>;
    firstName: z.ZodString;
    id: z.ZodString;
    avatar: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const contactRelationshipSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    sourcePersonId: z.ZodString;
    targetPersonId: z.ZodString;
    relationshipType: z.ZodEnum<{
        other: "other";
        parent: "parent";
        child: "child";
        spouse: "spouse";
        partner: "partner";
        sibling: "sibling";
        friend: "friend";
        colleague: "colleague";
        neighbor: "neighbor";
        guardian: "guardian";
        dependent: "dependent";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const contactRelationshipWithPeopleSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    sourcePersonId: z.ZodString;
    targetPersonId: z.ZodString;
    relationshipType: z.ZodEnum<{
        other: "other";
        parent: "parent";
        child: "child";
        spouse: "spouse";
        partner: "partner";
        sibling: "sibling";
        friend: "friend";
        colleague: "colleague";
        neighbor: "neighbor";
        guardian: "guardian";
        dependent: "dependent";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    sourcePerson: z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    targetPerson: z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const createContactApiInputSchema: z.ZodObject<{
    firstName: z.ZodString;
    middleName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    linkedin: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/** PATCH /api/contacts/:id — identity fields edited from mobile identity sheet. */
export declare const updateContactIdentitySchema: z.ZodPipe<z.ZodObject<{
    firstName: z.ZodString;
    middleName: z.ZodString;
    lastName: z.ZodString;
    headline: z.ZodString;
}, z.core.$strip>, z.ZodTransform<{
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    headline: string | null;
}, {
    firstName: string;
    middleName: string;
    lastName: string;
    headline: string;
}>>;
/** POST /api/contacts — minimal create from mobile FAB sheet. */
export declare const createContactInputSchema: z.ZodObject<{
    fullName: z.ZodString;
}, z.core.$strip>;
export declare const createContactSchema: z.ZodPipe<z.ZodObject<{
    fullName: z.ZodString;
}, z.core.$strip>, z.ZodTransform<{
    firstName: string;
    middleName: string | null;
    lastName: string | null;
}, {
    fullName: string;
}>>;
export declare const updateContactInputSchema: z.ZodObject<{
    middleName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    firstName: z.ZodOptional<z.ZodString>;
    facebook: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    instagram: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    language: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    position: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodUnknown>>>;
    userId: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    timezone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addresses: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>>>>;
    headline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notesUpdatedAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    lastInteraction: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastInteractionActivityId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    keepFrequencyDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    phones: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        prefix: z.ZodString;
        value: z.ZodString;
        type: z.ZodEnum<{
            home: "home";
            work: "work";
        }>;
        preferred: z.ZodBoolean;
    }, z.core.$strip>>>>;
    emails: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        type: z.ZodEnum<{
            home: "home";
            work: "work";
        }>;
        preferred: z.ZodBoolean;
    }, z.core.$strip>>>>;
    linkedin: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    whatsapp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    website: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    signal: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    importantDates: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>>>>;
    myself: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    gisPoint: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const contactResponseSchema: z.ZodObject<{
    contact: z.ZodObject<{
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
}, z.core.$strip>;
export declare const contactsListResponseSchema: z.ZodObject<Record<"contacts", z.ZodArray<z.ZodObject<{
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
}, z.core.$strip>>> & {
    totalCount: z.ZodNumber;
}, z.core.$strip>;
export declare const createContactRelationshipInputSchema: z.ZodObject<{
    relatedPersonId: z.ZodString;
    relationshipType: z.ZodEnum<{
        other: "other";
        parent: "parent";
        child: "child";
        spouse: "spouse";
        partner: "partner";
        sibling: "sibling";
        friend: "friend";
        colleague: "colleague";
        neighbor: "neighbor";
        guardian: "guardian";
        dependent: "dependent";
    }>;
}, z.core.$strip>;
export declare const updateContactRelationshipInputSchema: z.ZodObject<{
    relatedPersonId: z.ZodString;
    relationshipType: z.ZodEnum<{
        other: "other";
        parent: "parent";
        child: "child";
        spouse: "spouse";
        partner: "partner";
        sibling: "sibling";
        friend: "friend";
        colleague: "colleague";
        neighbor: "neighbor";
        guardian: "guardian";
        dependent: "dependent";
    }>;
}, z.core.$strip>;
export declare const contactRelationshipsResponseSchema: z.ZodObject<Record<"relationships", z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    sourcePersonId: z.ZodString;
    targetPersonId: z.ZodString;
    relationshipType: z.ZodEnum<{
        other: "other";
        parent: "parent";
        child: "child";
        spouse: "spouse";
        partner: "partner";
        sibling: "sibling";
        friend: "friend";
        colleague: "colleague";
        neighbor: "neighbor";
        guardian: "guardian";
        dependent: "dependent";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    sourcePerson: z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    targetPerson: z.ZodObject<{
        lastName: z.ZodNullable<z.ZodString>;
        firstName: z.ZodString;
        id: z.ZodString;
        avatar: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>>>, z.core.$strip>;
export declare const contactSortOrderSchema: z.ZodEnum<{
    nameAsc: "nameAsc";
    nameDesc: "nameDesc";
    surnameAsc: "surnameAsc";
    surnameDesc: "surnameDesc";
    interactionAsc: "interactionAsc";
    interactionDesc: "interactionDesc";
    createdAtAsc: "createdAtAsc";
    createdAtDesc: "createdAtDesc";
}>;
export declare const contactsFilterSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodEnum<{
        nameAsc: "nameAsc";
        nameDesc: "nameDesc";
        surnameAsc: "surnameAsc";
        surnameDesc: "surnameDesc";
        interactionAsc: "interactionAsc";
        interactionDesc: "interactionDesc";
        createdAtAsc: "createdAtAsc";
        createdAtDesc: "createdAtDesc";
    }>>;
}, z.core.$strip>;
export declare const deleteContactsRequestSchema: z.ZodUnion<readonly [z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    filter: z.ZodObject<{
        q: z.ZodOptional<z.ZodString>;
        sort: z.ZodOptional<z.ZodEnum<{
            nameAsc: "nameAsc";
            nameDesc: "nameDesc";
            surnameAsc: "surnameAsc";
            surnameDesc: "surnameDesc";
            interactionAsc: "interactionAsc";
            interactionDesc: "interactionDesc";
            createdAtAsc: "createdAtAsc";
            createdAtDesc: "createdAtDesc";
        }>>;
    }, z.core.$strip>;
    excludeIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>]>;
export declare const workHistoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    companyName: z.ZodString;
    companyLinkedinUrl: z.ZodNullable<z.ZodString>;
    companyLogoUrl: z.ZodNullable<z.ZodString>;
    title: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    startDate: z.ZodNullable<z.ZodString>;
    endDate: z.ZodNullable<z.ZodString>;
    employmentType: z.ZodNullable<z.ZodString>;
    location: z.ZodNullable<z.ZodString>;
    peopleLinkedinId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const educationEntrySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    schoolName: z.ZodString;
    schoolLinkedinUrl: z.ZodNullable<z.ZodString>;
    schoolLogoUrl: z.ZodNullable<z.ZodString>;
    degree: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    startDate: z.ZodNullable<z.ZodString>;
    endDate: z.ZodNullable<z.ZodString>;
    peopleLinkedinId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const linkedInDataResponseSchema: z.ZodObject<{
    linkedinBio: z.ZodNullable<z.ZodString>;
    syncedAt: z.ZodNullable<z.ZodString>;
    workHistory: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        companyName: z.ZodString;
        companyLinkedinUrl: z.ZodNullable<z.ZodString>;
        companyLogoUrl: z.ZodNullable<z.ZodString>;
        title: z.ZodNullable<z.ZodString>;
        description: z.ZodNullable<z.ZodString>;
        startDate: z.ZodNullable<z.ZodString>;
        endDate: z.ZodNullable<z.ZodString>;
        employmentType: z.ZodNullable<z.ZodString>;
        location: z.ZodNullable<z.ZodString>;
        peopleLinkedinId: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    education: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        schoolName: z.ZodString;
        schoolLinkedinUrl: z.ZodNullable<z.ZodString>;
        schoolLogoUrl: z.ZodNullable<z.ZodString>;
        degree: z.ZodNullable<z.ZodString>;
        description: z.ZodNullable<z.ZodString>;
        startDate: z.ZodNullable<z.ZodString>;
        endDate: z.ZodNullable<z.ZodString>;
        peopleLinkedinId: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const enrichQueueStatusSchema: z.ZodEnum<{
    pending: "pending";
    processing: "processing";
    completed: "completed";
    failed: "failed";
}>;
export declare const enrichQueueItemSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    personId: z.ZodString;
    status: z.ZodEnum<{
        pending: "pending";
        processing: "processing";
        completed: "completed";
        failed: "failed";
    }>;
    errorMessage: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    linkedinHandle: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const enrichEligibleCountResponseSchema: z.ZodObject<{
    count: z.ZodNumber;
}, z.core.$strip>;
export declare const shareableFieldSchema: z.ZodEnum<{
    facebook: "facebook";
    instagram: "instagram";
    name: "name";
    avatar: "avatar";
    addresses: "addresses";
    headline: "headline";
    location: "location";
    notes: "notes";
    phones: "phones";
    emails: "emails";
    linkedin: "linkedin";
    whatsapp: "whatsapp";
    website: "website";
    signal: "signal";
    importantDates: "importantDates";
}>;
export type Contact = z.infer<typeof contactSchema>;
export type ContactPreview = z.infer<typeof contactPreviewSchema>;
export type RelationshipType = z.infer<typeof relationshipTypeSchema>;
export type ContactRelationship = z.infer<typeof contactRelationshipSchema>;
export type ContactRelationshipWithPeople = z.infer<typeof contactRelationshipWithPeopleSchema>;
export type CreateContactInput = z.infer<typeof createContactApiInputSchema>;
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;
export type ContactsListResponse = z.infer<typeof contactsListResponseSchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
export type CreateContactRelationshipInput = z.infer<typeof createContactRelationshipInputSchema>;
export type UpdateContactRelationshipInput = z.infer<typeof updateContactRelationshipInputSchema>;
export type ContactRelationshipsResponse = z.infer<typeof contactRelationshipsResponseSchema>;
export type ContactsFilter = z.infer<typeof contactsFilterSchema>;
export type DeleteContactsRequest = z.infer<typeof deleteContactsRequestSchema>;
export type WorkHistoryEntry = z.infer<typeof workHistoryEntrySchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
export type LinkedInDataResponse = z.infer<typeof linkedInDataResponseSchema>;
export type EnrichQueueStatus = z.infer<typeof enrichQueueStatusSchema>;
export type EnrichQueueItem = z.infer<typeof enrichQueueItemSchema>;
export type EnrichEligibleCountResponse = z.infer<typeof enrichEligibleCountResponseSchema>;
export type ShareableField = z.infer<typeof shareableFieldSchema>;
export type CreateContactNameInput = z.input<typeof createContactSchema>;
export type CreateContactPayload = z.output<typeof createContactSchema>;
export type UpdateContactIdentityInput = z.infer<typeof updateContactIdentitySchema>;
