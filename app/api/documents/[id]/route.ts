import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { documents, documentMembers, users } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getOrCreateDbUser } from "@/lib/auth";

// GET /api/documents/[id] — get a single document (with role check)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    await requireRole(id, clerkUserId, "viewer");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.query.documentMembers.findFirst({
    where: and(
      eq(documentMembers.documentId, id),
      eq(documentMembers.userId, (await getOrCreateDbUser())!.id)
    ),
  });

  return NextResponse.json({ ...doc, role: member?.role ?? "viewer" });
}

// PATCH /api/documents/[id] — update document title
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    await requireRole(id, clerkUserId, "editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.slice(0, 255) : null;
  if (!title) return NextResponse.json({ error: "Invalid title" }, { status: 400 });

  await db
    .update(documents)
    .set({ title, updatedAt: new Date() })
    .where(eq(documents.id, id));

  return NextResponse.json({ ok: true });
}

// DELETE /api/documents/[id] — delete a document (owner only)
export async function DELETE(
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

  await db.delete(documents).where(eq(documents.id, id));

  return NextResponse.json({ ok: true });
}
