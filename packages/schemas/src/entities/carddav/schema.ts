import { z } from "zod";
import { CARDDAV_LIMITS } from "#constants/index.js";
import { createdAtSchema, labelFieldSchema, nullableDateTimeSchema } from "../_shared/schema.js";
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

const deviceNameSchema = labelFieldSchema(CARDDAV_LIMITS.deviceNameMaxLength, "Name").describe(
  "Display name for the device, for example the phone model",
);

export const createCarddavDeviceInputSchema: z.ZodType<CreateCarddavDeviceInput> = z.object({
  name: deviceNameSchema,
});

export const updateCarddavDeviceInputSchema: z.ZodType<UpdateCarddavDeviceInput> = z.object({
  name: deviceNameSchema,
});

export const carddavDeviceSchema = z.object({
  clientFamily: z
    .string()
    .nullable()
    .describe(
      "Client the device last used: dataaccessd, AddressBookCore, DAVx5, Thunderbird, or other. Null before the first request",
    ),
  createdAt: createdAtSchema,
  id: z.string().uuid().describe("Device identifier"),
  keyStart: z.string().describe("First characters of the device password, to tell devices apart"),
  lastSeenAt: nullableDateTimeSchema.describe("Time of the last signed-in request from the device"),
  lastSyncedAt: nullableDateTimeSchema.describe(
    "Time of the last successful sync answer to the device",
  ),
  name: z.string().describe("Display name for the device"),
  pausedAt: nullableDateTimeSchema.describe(
    "Time the mass-change guard paused writes from the device. Null when the device can write",
  ),
}) satisfies z.ZodType<CarddavDevice>;

export const carddavCredentialsSchema = z.object({
  password: z
    .string()
    .describe("Device password. Shown only once, when the device is created or rotated"),
  serverUrl: z.string().describe("CardDAV server address to enter on the device"),
  username: z.string().describe("Username to enter on the device. It is the account identifier"),
}) satisfies z.ZodType<CarddavCredentials>;

export const carddavSettingsSchema = z.object({
  devices: z.array(carddavDeviceSchema).describe("Devices connected to this account"),
  enabled: z.boolean().describe("True when this deployment offers CardDAV sync"),
  maxDevices: z.number().describe("Most devices one account can connect"),
  serverUrl: z.string().describe("CardDAV server address to enter on a device"),
  username: z.string().describe("Username to enter on a device. It is the account identifier"),
}) satisfies z.ZodType<CarddavSettings>;

export const carddavSettingsResponseSchema = z.object({
  carddav: carddavSettingsSchema.describe("CardDAV sync settings and connected devices"),
}) satisfies z.ZodType<CarddavSettingsResponse>;

export const carddavDeviceResponseSchema = z.object({
  device: carddavDeviceSchema.describe("The device"),
}) satisfies z.ZodType<CarddavDeviceResponse>;

export const carddavDeviceCredentialsResponseSchema = z.object({
  credentials: carddavCredentialsSchema.describe("Credentials to enter on the device"),
  device: carddavDeviceSchema.describe("The device"),
}) satisfies z.ZodType<CarddavDeviceCredentialsResponse>;
