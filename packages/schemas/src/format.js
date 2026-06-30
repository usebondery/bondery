/** Returns the first human-readable message from a Zod error (for toasts). */
export function firstZodErrorMessage(error) {
    return error.issues[0]?.message ?? "Invalid input";
}
