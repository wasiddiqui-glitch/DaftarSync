import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { snapshots } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getOrCreateDbUser } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { nanoid } from "nanoid";

const sql = neon(process.env.DATABASE_URL!);

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
      id: snapshots.id,
      label: snapshots.label,
      createdAt: snapshots.createdAt,
      createdBy: snapshots.createdBy,
    })
    .from(snapshots)
    .where(eq(snapshots.documentId, id))
    .orderBy(desc(snapshots.createdAt));

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
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 255) : "";
  if (!label) return NextResponse.json({ error: "Label required" }, { status: 400 });

  // Copy the current Yjs state from document_yjs_state into the snapshot
  const rows = await sql.query(
    `SELECT yjs_state FROM document_yjs_state WHERE document_id = $1 LIMIT 1`,
    [id]
  );

  if (rows.length === 0 || !rows[0].yjs_state) {
    return NextResponse.json({ error: "No document state found. Start typing first." }, { status: 400 });
  }

  const snapshotId = nanoid();

  await db.insert(snapshots).values({
    id: snapshotId,
    documentId: id,
    createdBy: user.id,
    label,
    yjsState: rows[0].yjs_state as Buffer,
  });

  return NextResponse.json({ id: snapshotId }, { status: 201 });
}
