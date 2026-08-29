import { z } from "zod";

export const generalSettingsSchema = z.object({
  website: z.string().url().or(z.literal("")),
});

export type GeneralSettingsSchema = z.infer<typeof generalSettingsSchema>;
