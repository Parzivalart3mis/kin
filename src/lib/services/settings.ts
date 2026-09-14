import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { SettingsInput } from "@/lib/schemas";

export interface SettingsDto {
  notificationTime: string;
  timezone: string;
}

export function toSettingsDto(user: User): SettingsDto {
  return { notificationTime: user.notificationTime, timezone: user.timezone };
}

export async function updateSettings(user: User, input: SettingsInput): Promise<User> {
  const [row] = await db
    .update(users)
    .set({
      notificationTime: input.notificationTime ?? user.notificationTime,
      timezone: input.timezone ?? user.timezone,
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!row) throw new AppError("INTERNAL", "Update returned no row");
  return row;
}
