import { z } from "zod";
import { createContactInputSchema } from "@bondery/schemas";
import { parseFullName } from "../name/index.js";

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
    middleName: parsed.middleName,
    lastName: parsed.lastName,
  };
});

export type CreateContactFromFullNameInput = z.input<typeof createContactFromFullNameSchema>;
export type CreateContactFromFullNameOutput = z.output<typeof createContactFromFullNameSchema>;
