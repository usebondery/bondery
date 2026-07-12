import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { channelTypeSchema } from "./schema.js";
import type { ChannelType } from "./types.js";

type _ChannelType = Assert<IsEqual<ChannelType, z.infer<typeof channelTypeSchema>>>;
