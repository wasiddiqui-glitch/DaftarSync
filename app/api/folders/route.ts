import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { folders } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const rows = await db.query.folders.findMany({
    where: eq(folders.ownerId, user.id),
    orderBy: (f, { asc }) => [asc(f.name)],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const user = await getOrCreateDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 128) : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const id = nanoid();
  await db.insert(folders).values({ id, name, ownerId: user.id });

  return NextResponse.json({ id, name }, { status: 201 });
}
