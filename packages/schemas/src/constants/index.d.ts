export declare const CONTACT_FIELD_MAX_LENGTHS: {
    readonly firstName: 50;
    readonly middleName: 50;
    readonly lastName: 50;
    readonly fullName: 150;
    readonly headline: 100;
    readonly location: 100;
    readonly description: 500;
    readonly addressLabel: 64;
    readonly dateNote: 50;
    readonly dateName: 50;
    readonly notesHtml: 20000;
};
export declare const CONTACT_LIMITS: {
    readonly maxImportantDates: 5;
    readonly maxPhones: 5;
    readonly maxEmails: 5;
    readonly maxAddresses: 5;
};
/** Shared max length for group and tag labels. */
export declare const GROUP_LABEL_MAX_LENGTH = 100;
/** ISO date sentinel for year-less recurring dates (birthdays, namedays). */
export declare const YEARLESS_DATE_SENTINEL = 1904;
export declare const IMPORTANT_DATE_TYPES: readonly ["birthday", "anniversary", "nameday", "graduation", "other"];
export declare const IMPORTANT_DATE_NOTIFY_DAYS: readonly [1, 3, 7];
export declare const AVATAR_UPLOAD: {
    readonly allowedMimeTypes: readonly ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    readonly maxFileSizeBytes: number;
    readonly maxFileSizeMB: 5;
};
