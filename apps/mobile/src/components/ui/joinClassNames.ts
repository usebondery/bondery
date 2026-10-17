/** Join Uniwind className fragments. Skips empty values. */
export function joinClassNames(...parts: Array<string | false | null | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}
