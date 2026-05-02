import { db } from "@/lib/db";
import { documentMembers, documents, users } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import type { UserRole } from "@/types";

export async function getUserRole(
  documentId: string,
  clerkUserId: string
): Promise<UserRole | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (!user) return null;

  const member = await db.query.documentMembers.findFirst({
    where: and(
      eq(documentMembers.documentId, documentId),
      eq(documentMembers.userId, user.id)
    ),
  });

  return (member?.role as UserRole) ?? null;
}

export async function canEdit(documentId: string, clerkUserId: string) {
  const role = await getUserRole(documentId, clerkUserId);
  return role === "owner" || role === "editor";
}

export async function canView(documentId: string, clerkUserId: string) {
  const role = await getUserRole(documentId, clerkUserId);
  return role !== null;
}

export async function requireRole(
  documentId: string,
  clerkUserId: string,
  minRole: UserRole
): Promise<UserRole> {
  const role = await getUserRole(documentId, clerkUserId);
  const hierarchy: UserRole[] = ["viewer", "editor", "owner"];

  if (!role || hierarchy.indexOf(role) < hierarchy.indexOf(minRole)) {
    throw new Error("Forbidden");
  }
  return role;
}
