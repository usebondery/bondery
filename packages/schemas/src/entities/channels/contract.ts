import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { channelTypeSchema } from "#primitives/channel/schema.js";
import type { ChannelType } from "#primitives/channel/types.js";
import type {
  emailEntryEntitySchema,
  emailEntrySchema,
  phoneEntryEntitySchema,
  phoneEntrySchema,
  shareContactEmailSchema,
} from "./schema.js";
import type {
  ContactType,
  EmailEntry,
  EmailEntryInput,
  PhoneEntry,
  PhoneEntryInput,
  ShareContactEmailInput,
} from "./types.js";

export type _ContactType = Assert<IsEqual<ContactType, z.infer<typeof channelTypeSchema>>>;
export type _PhoneEntry = Assert<IsEqual<PhoneEntry, z.infer<typeof phoneEntryEntitySchema>>>;
export type _EmailEntry = Assert<IsEqual<EmailEntry, z.infer<typeof emailEntryEntitySchema>>>;
export type _PhoneEntryInput = Assert<IsEqual<PhoneEntryInput, z.infer<typeof phoneEntrySchema>>>;
export type _EmailEntryInput = Assert<IsEqual<EmailEntryInput, z.infer<typeof emailEntrySchema>>>;
export type _ShareContactEmailInput = Assert<
  IsEqual<ShareContactEmailInput, z.infer<typeof shareContactEmailSchema>>
>;

// Ensure ContactType stays aligned with the shared channel primitive.
export type _ChannelType = Assert<IsEqual<ChannelType, ContactType>>;
