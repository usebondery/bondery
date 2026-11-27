import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  carddavCredentialsSchema,
  carddavDeviceCredentialsResponseSchema,
  carddavDeviceResponseSchema,
  carddavDeviceSchema,
  carddavSettingsResponseSchema,
  carddavSettingsSchema,
  createCarddavDeviceInputSchema,
  updateCarddavDeviceInputSchema,
} from "./schema.js";
import type {
  CarddavCredentials,
  CarddavDevice,
  CarddavDeviceCredentialsResponse,
  CarddavDeviceResponse,
  CarddavSettings,
  CarddavSettingsResponse,
  CreateCarddavDeviceInput,
  UpdateCarddavDeviceInput,
} from "./types.js";

export type _CreateCarddavDeviceInput = Assert<
  IsEqual<CreateCarddavDeviceInput, z.infer<typeof createCarddavDeviceInputSchema>>
>;
export type _UpdateCarddavDeviceInput = Assert<
  IsEqual<UpdateCarddavDeviceInput, z.infer<typeof updateCarddavDeviceInputSchema>>
>;
export type _CarddavDevice = Assert<IsEqual<CarddavDevice, z.infer<typeof carddavDeviceSchema>>>;
export type _CarddavCredentials = Assert<
  IsEqual<CarddavCredentials, z.infer<typeof carddavCredentialsSchema>>
>;
export type _CarddavSettings = Assert<
  IsEqual<CarddavSettings, z.infer<typeof carddavSettingsSchema>>
>;
export type _CarddavSettingsResponse = Assert<
  IsEqual<CarddavSettingsResponse, z.infer<typeof carddavSettingsResponseSchema>>
>;
export type _CarddavDeviceResponse = Assert<
  IsEqual<CarddavDeviceResponse, z.infer<typeof carddavDeviceResponseSchema>>
>;
export type _CarddavDeviceCredentialsResponse = Assert<
  IsEqual<CarddavDeviceCredentialsResponse, z.infer<typeof carddavDeviceCredentialsResponseSchema>>
>;
