import { z } from "zod";
import { FREQUENCY_PERIODS } from "./interval";
import { isValidTimeZone } from "./tz";

export const frequencyPeriodSchema = z.enum(FREQUENCY_PERIODS);

const timezoneSchema = z
  .string()
  .min(1)
  .refine(isValidTimeZone, { message: "Unknown timezone" });

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm");

export const createPersonSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  phone: z.string().trim().min(3, "Phone is required").max(32),
  countryCode: z.string().trim().length(2).toUpperCase(),
  timezone: timezoneSchema,
  frequencyCount: z.number().int().positive().max(30),
  frequencyPeriod: frequencyPeriodSchema,
});
export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const updatePersonSchema = createPersonSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Nothing to update" },
);
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

export const callSchema = z.object({
  personId: z.uuid(),
  type: z.enum(["completed", "attempt"]),
  /** Optional client timestamp so offline-queued calls keep their real time. */
  occurredAt: z.iso.datetime().optional(),
});
export type CallInput = z.infer<typeof callSchema>;

export const settingsSchema = z
  .object({
    notificationTime: hhmm.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((v) => v.notificationTime !== undefined || v.timezone !== undefined, {
    message: "Nothing to update",
  });
export type SettingsInput = z.infer<typeof settingsSchema>;

export const subscribeSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const timezonesQuerySchema = z.object({
  countryCode: z.string().trim().length(2).toUpperCase(),
});

/** Wire shape of a person (dates as ISO strings). */
export const personDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  countryCode: z.string(),
  timezone: z.string(),
  frequencyCount: z.number().int(),
  frequencyPeriod: frequencyPeriodSchema,
  lastConversationAt: z.string().nullable(),
  nextDueAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PersonDto = z.infer<typeof personDtoSchema>;

export const personWithStatusDtoSchema = personDtoSchema.extend({
  localTime: z.string(),
  isNight: z.boolean(),
  struckToday: z.boolean(),
  attemptsToday: z.number().int(),
  lastAttemptAt: z.string().nullable(),
});
export type PersonWithStatusDto = z.infer<typeof personWithStatusDtoSchema>;

export const callLogDtoSchema = z.object({
  id: z.uuid(),
  personId: z.uuid(),
  type: z.enum(["completed", "attempt"]),
  occurredAt: z.string(),
  /** Echoed back so the client can update the row without a refetch. */
  person: personDtoSchema,
});
export type CallLogDto = z.infer<typeof callLogDtoSchema>;
