import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { people, type Person } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { computeNextDue } from "@/lib/interval";
import { toE164 } from "@/lib/phone";
import type { CreatePersonInput, UpdatePersonInput } from "@/lib/schemas";

export async function listPeople(userId: string): Promise<Person[]> {
  return db.query.people.findMany({
    where: eq(people.userId, userId),
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}

export async function getPerson(userId: string, id: string): Promise<Person> {
  const row = await db.query.people.findFirst({
    where: and(eq(people.id, id), eq(people.userId, userId)),
  });
  if (!row) throw new AppError("NOT_FOUND", "Person not found");
  return row;
}

export async function createPerson(
  userId: string,
  input: CreatePersonInput,
  now = new Date(),
): Promise<Person> {
  const phone = toE164(input.phone, input.countryCode);
  if (!phone) throw new AppError("VALIDATION", "phone: not a valid number for that country");

  const [row] = await db
    .insert(people)
    .values({
      userId,
      name: input.name,
      phone,
      countryCode: input.countryCode,
      timezone: input.timezone,
      frequencyCount: input.frequencyCount,
      frequencyPeriod: input.frequencyPeriod,
      lastConversationAt: null,
      // No conversation yet → due from the moment they're added.
      nextDueAt: computeNextDue(null, input.frequencyPeriod, input.frequencyCount, now),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new AppError("INTERNAL", "Insert returned no row");
  return row;
}

export async function updatePerson(
  userId: string,
  id: string,
  input: UpdatePersonInput,
  now = new Date(),
): Promise<Person> {
  const existing = await getPerson(userId, id);

  const countryCode = input.countryCode ?? existing.countryCode;
  let phone = existing.phone;
  if (input.phone !== undefined || input.countryCode !== undefined) {
    const next = toE164(input.phone ?? existing.phone, countryCode);
    if (!next) throw new AppError("VALIDATION", "phone: not a valid number for that country");
    phone = next;
  }

  const frequencyCount = input.frequencyCount ?? existing.frequencyCount;
  const frequencyPeriod = input.frequencyPeriod ?? existing.frequencyPeriod;
  // Changing the frequency re-derives the due date from the last real
  // conversation. With none on record the existing due date stands.
  const nextDueAt =
    frequencyCount !== existing.frequencyCount || frequencyPeriod !== existing.frequencyPeriod
      ? computeNextDue(existing.lastConversationAt, frequencyPeriod, frequencyCount, existing.nextDueAt)
      : existing.nextDueAt;

  const [row] = await db
    .update(people)
    .set({
      name: input.name ?? existing.name,
      phone,
      countryCode,
      timezone: input.timezone ?? existing.timezone,
      frequencyCount,
      frequencyPeriod,
      nextDueAt,
      updatedAt: now,
    })
    .where(and(eq(people.id, id), eq(people.userId, userId)))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Person not found");
  return row;
}

export async function deletePerson(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(people)
    .where(and(eq(people.id, id), eq(people.userId, userId)))
    .returning({ id: people.id });
  if (deleted.length === 0) throw new AppError("NOT_FOUND", "Person not found");
}
