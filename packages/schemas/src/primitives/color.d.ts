import { z } from "zod";
export declare const hexColorSchema: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export type HexColor = z.infer<typeof hexColorSchema>;
