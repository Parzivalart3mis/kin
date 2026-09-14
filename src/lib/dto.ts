import type { Person } from "@/db/schema";
import type { PersonWithStatus } from "./due";
import type { PersonDto, PersonWithStatusDto } from "./schemas";

export function toPersonDto(p: Person): PersonDto {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    countryCode: p.countryCode,
    timezone: p.timezone,
    frequencyCount: p.frequencyCount,
    frequencyPeriod: p.frequencyPeriod,
    lastConversationAt: p.lastConversationAt ? p.lastConversationAt.toISOString() : null,
    nextDueAt: p.nextDueAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toPersonWithStatusDto(p: PersonWithStatus): PersonWithStatusDto {
  return {
    ...toPersonDto(p),
    localTime: p.localTime,
    isNight: p.isNight,
    struckToday: p.struckToday,
    attemptsToday: p.attemptsToday,
    lastAttemptAt: p.lastAttemptAt,
  };
}
