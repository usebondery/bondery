import { createContactInputSchema } from "@bondery/schemas";
import { z } from "zod";
import { parseFullName } from "#name/index.js";

export const createContactFromFullNameSchema = createContactInputSchema.transform((value, ctx) => {
  const parsed = parseFullName(value.fullName);
  if (!parsed.firstName) {
    ctx.addIssue({
      code: "custom",
      message: "Name is required",
      path: ["fullName"],
    });
    return z.NEVER;
  }

  return {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    middleName: parsed.middleName,
  };
});

export type CreateContactFromFullNameInput = z.input<typeof createContactFromFullNameSchema>;
export type CreateContactFromFullNameOutput = z.output<typeof createContactFromFullNameSchema>;
