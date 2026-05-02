import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { folders } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 128) : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const result = await db
    .update(folders)
    .set({ name })
    .where(and(eq(folders.id, id), eq(folders.ownerId, user.id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(folders).where(and(eq(folders.id, id), eq(folders.ownerId, user.id)));

  return NextResponse.json({ ok: true });
}
