import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { documentMembers, users } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";

// POST /api/documents/[id]/members — invite a user by email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    await requireRole(id, clerkUserId, "owner");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, role = "editor" } = body;

  if (!email || !["editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const invitedUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!invitedUser) {
    return NextResponse.json({ error: "User not found. They must sign in first." }, { status: 404 });
  }

  const existing = await db.query.documentMembers.findFirst({
    where: and(
      eq(documentMembers.documentId, id),
      eq(documentMembers.userId, invitedUser.id)
    ),
  });

  if (existing) {
    // Update role if already a member
    await db
      .update(documentMembers)
      .set({ role })
      .where(
        and(
          eq(documentMembers.documentId, id),
          eq(documentMembers.userId, invitedUser.id)
        )
      );
  } else {
    await db.insert(documentMembers).values({
      documentId: id,
      userId: invitedUser.id,
      role,
    });
  }

  return NextResponse.json({ ok: true });
}
