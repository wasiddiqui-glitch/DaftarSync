import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { comments, users } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getOrCreateDbUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    await requireRole(id, clerkUserId, "viewer");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.documentId, id)),
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  // Only the author can edit the body
  if (typeof body.body === "string" && comment.authorId === user.id) {
    updates.body = body.body.trim();
  }

  // Author or owner/editor can resolve
  if (typeof body.resolved === "boolean") {
    const role = await requireRole(id, clerkUserId, "editor").catch(() => null);
    if (role || comment.authorId === user.id) {
      updates.resolved = body.resolved;
    }
  }

  await db.update(comments).set(updates).where(eq(comments.id, commentId));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const comment = await db.query.comments.findFirst({
    where: and(eq(comments.id, commentId), eq(comments.documentId, id)),
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the author or an owner can delete
  if (comment.authorId !== user.id) {
    try {
      await requireRole(id, clerkUserId, "owner");
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  return NextResponse.json({ ok: true });
}
