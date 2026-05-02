import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { documents, documentMembers, users } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getOrCreateDbUser } from "@/lib/auth";

// GET /api/documents — list all documents the current user has access to
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      ownerId: documents.ownerId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      role: documentMembers.role,
    })
    .from(documentMembers)
    .innerJoin(documents, eq(documentMembers.documentId, documents.id))
    .where(eq(documentMembers.userId, user.id))
    .orderBy(desc(documents.updatedAt));

  return NextResponse.json(rows);
}

// POST /api/documents — create a new document
export async function POST() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const docId = nanoid();

  await db.insert(documents).values({
    id: docId,
    title: "Untitled Document",
    ownerId: user.id,
  });

  await db.insert(documentMembers).values({
    documentId: docId,
    userId: user.id,
    role: "owner",
  });

  return NextResponse.json({ id: docId }, { status: 201 });
}
