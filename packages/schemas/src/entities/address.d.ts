import { z } from "zod";
export declare const contactAddressTypeSchema: z.ZodEnum<{
    other: "other";
    home: "home";
    work: "work";
}>;
export declare const contactAddressGranularitySchema: z.ZodEnum<{
    city: "city";
    address: "address";
    state: "state";
    country: "country";
}>;
export declare const contactAddressGeocodeSourceSchema: z.ZodEnum<{
    "mapy.com": "mapy.com";
    manual: "manual";
}>;
export declare const contactAddressConfidenceSchema: z.ZodEnum<{
    verified: "verified";
    unverifiable: "unverifiable";
}>;
export declare const contactAddressSheetSchema: z.ZodObject<{
    value: z.ZodString;
    type: z.ZodEnum<{
        other: "other";
        home: "home";
        work: "work";
    }>;
    label: z.ZodPipe<z.ZodString, z.ZodTransform<string | null, string>>;
}, z.core.$strip>;
export declare const contactAddressEntrySchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const geocodeSuggestAddressSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const geocodeSuggestResponseSchema: z.ZodObject<{
    addresses: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const geocodeTimezoneResponseSchema: z.ZodObject<{
    timezone: z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>, z.ZodTransform<string | null, string | null>>;
}, z.core.$strip>;
export declare const replaceAddressesSchema: z.ZodArray<z.ZodObject<{
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
}, z.core.$strip>>;
export type ContactAddressType = z.infer<typeof contactAddressTypeSchema>;
export type ContactAddressEntry = z.infer<typeof contactAddressEntrySchema>;
export type ContactAddressSheetInput = z.input<typeof contactAddressSheetSchema>;
export type ContactAddressSheetOutput = z.output<typeof contactAddressSheetSchema>;
export type ContactAddressEntryInput = z.input<typeof contactAddressEntrySchema>;
export type ContactAddressEntryOutput = z.output<typeof contactAddressEntrySchema>;
export type GeocodeSuggestAddressInput = z.input<typeof geocodeSuggestAddressSchema>;
export type GeocodeSuggestAddressOutput = z.output<typeof geocodeSuggestAddressSchema>;
export type GeocodeSuggestResponseInput = z.input<typeof geocodeSuggestResponseSchema>;
export type GeocodeSuggestResponseOutput = z.output<typeof geocodeSuggestResponseSchema>;
export type GeocodeTimezoneResponseInput = z.input<typeof geocodeTimezoneResponseSchema>;
export type GeocodeTimezoneResponseOutput = z.output<typeof geocodeTimezoneResponseSchema>;
export type ReplaceAddressesInput = z.infer<typeof replaceAddressesSchema>;
