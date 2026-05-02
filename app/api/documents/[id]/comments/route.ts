import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { comments, users } from "@/drizzle/schema";
import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getOrCreateDbUser } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function GET(
  _req: NextRequest,
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

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      resolved: comments.resolved,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorImageUrl: users.imageUrl,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.documentId, id))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json(rows);
}

export async function POST(
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

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Body required" }, { status: 400 });

  const commentId = nanoid();

  await db.insert(comments).values({
    id: commentId,
    documentId: id,
    authorId: user.id,
    body: text,
  });

  return NextResponse.json({ id: commentId }, { status: 201 });
}
