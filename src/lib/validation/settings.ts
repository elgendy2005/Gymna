import { z } from "zod";
import {
  DUMBBELL_STEPS_KG,
  MACHINE_STEPS_KG,
  UNIT_SYSTEMS,
} from "@/lib/profile-options";
import { focusAreasSchema, trainingDaysSchema } from "@/lib/validation/onboarding";

const oneOf = <T extends readonly number[]>(values: T) =>
  z.number().refine((value): value is T[number] => values.includes(value));

export const settingsSchema = z.object({
  unitSystem: z.enum(UNIT_SYSTEMS),
  dumbbellStepKg: oneOf(DUMBBELL_STEPS_KG),
  machineStepKg: oneOf(MACHINE_STEPS_KG),
  focusAreas: focusAreasSchema,
  // The count is checked on the server against the saved days per week.
  trainingDays: trainingDaysSchema,
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export type SettingsErrorCode =
  | "invalid_input"
  | "trainingDaysCount"
  | "unauthorized"
  | "server_error";

export type SettingsResult = { ok: true } | { ok: false; error: SettingsErrorCode };
