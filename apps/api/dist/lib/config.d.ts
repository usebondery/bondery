/**
 * Shared configuration for the API server
 */
export declare const AVATAR_UPLOAD: {
    readonly allowedMimeTypes: readonly ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    readonly maxFileSize: number;
    readonly maxFileSizeMB: 5;
};
/**
 * Validates image upload
 */
export declare function validateImageUpload(file: {
    type: string;
    size: number;
}): {
    isValid: boolean;
    error?: string;
};
/**
 * URLs for redirects
 */
export declare const URLS: {
    readonly webapp: string | undefined;
    readonly website: string | undefined;
    readonly login: "/login";
};
