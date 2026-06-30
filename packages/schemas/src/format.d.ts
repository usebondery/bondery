import type { ZodError } from "zod";
/** Returns the first human-readable message from a Zod error (for toasts). */
export declare function firstZodErrorMessage(error: ZodError): string;
