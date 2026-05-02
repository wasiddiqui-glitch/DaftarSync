import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Returns the current user's DB record, creating it if it doesn't exist yet.
 * Call this in server components / route handlers where Clerk's currentUser() works.
 */
export async function getOrCreateDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUser.id),
  });

  if (existing) return existing;

  const newUser = {
    id: nanoid(),
    clerkUserId: clerkUser.id,
    name:
      `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
      clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "User",
    email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
    imageUrl: clerkUser.imageUrl ?? null,
  };

  await db.insert(users).values(newUser);
  return newUser;
}

/** Throws if not authenticated. Returns clerk userId. */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}
