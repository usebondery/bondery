import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { emailAddressSchema, loginEmailFormSchema } from "./schema.js";
import type { EmailAddress, LoginEmailFormValues } from "./types.js";

export type _EmailAddress = Assert<IsEqual<EmailAddress, z.infer<typeof emailAddressSchema>>>;
export type _LoginEmailFormValues = Assert<
  IsEqual<LoginEmailFormValues, z.infer<typeof loginEmailFormSchema>>
>;
