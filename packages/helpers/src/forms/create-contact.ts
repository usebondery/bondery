import { createContactInputSchema } from "@bondery/schemas";
import { z } from "zod";
import { parseFullName } from "#name/index.js";

export type CreateContactFromFullNameInput = z.input<typeof createContactInputSchema>;

export type CreateContactFromFullNameOutput = {
  firstName: string;
  lastName: string | null;
  middleName: string | null;
};

export const createContactFromFullNameSchema: z.ZodType<
  CreateContactFromFullNameOutput,
  CreateContactFromFullNameInput
> = createContactInputSchema.transform((value, ctx): CreateContactFromFullNameOutput => {
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
