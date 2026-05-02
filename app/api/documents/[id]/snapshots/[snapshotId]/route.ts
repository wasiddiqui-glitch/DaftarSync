import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { snapshots } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// POST /api/documents/[id]/snapshots/[snapshotId]/restore
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const { id, snapshotId } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    await requireRole(id, clerkUserId, "editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await db.query.snapshots.findFirst({
    where: and(eq(snapshots.id, snapshotId), eq(snapshots.documentId, id)),
  });

  if (!snapshot) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });

  // Write the snapshot's Yjs state back as the current document state
  await sql.query(
    `INSERT INTO document_yjs_state (document_id, yjs_state, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (document_id)
     DO UPDATE SET yjs_state = EXCLUDED.yjs_state, updated_at = EXCLUDED.updated_at`,
    [id, snapshot.yjsState]
  );

  await sql.query(
    `UPDATE documents SET updated_at = NOW() WHERE id = $1`,
    [id]
  );

  // Tell the Hocuspocus server to evict and reload the document
  try {
    const internalUrl = process.env.HOCUSPOCUS_INTERNAL_URL ?? "http://localhost:1234";
    await fetch(`${internalUrl}/_internal/reload/${id}`, {
      method: "POST",
      headers: {
        "x-internal-secret": process.env.HOCUSPOCUS_INTERNAL_SECRET ?? "",
      },
    });
  } catch {
    // Non-fatal — the next reconnect will pick up the restored state
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const { id, snapshotId } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    await requireRole(id, clerkUserId, "owner");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(snapshots).where(
    and(eq(snapshots.id, snapshotId), eq(snapshots.documentId, id))
  );

  return NextResponse.json({ ok: true });
}
