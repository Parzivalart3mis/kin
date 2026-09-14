import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { AppError } from "./errors";

/**
 * Resolve the signed-in Clerk user to our mirrored `users` row, creating it on
 * first sight. No webhook needed: the row appears on the first authenticated
 * request and is keyed by `clerkId`.
 */
export async function requireUser(): Promise<User> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new AppError("UNAUTHORIZED", "Sign in required");
  }

  const existing = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (existing) return existing;

  // Two first-requests can race; the unique index makes the loser a no-op.
  await db.insert(users).values({ clerkId }).onConflictDoNothing({ target: users.clerkId });
  const created = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!created) {
    throw new AppError("INTERNAL", "Could not create user");
  }
  return created;
}
