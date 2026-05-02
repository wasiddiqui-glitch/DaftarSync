"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FolderInput, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { MoveToFolderDialog } from "@/components/dashboard/MoveToFolderDialog";
import type { UserRole } from "@/types";

const PREVIEWS = [
  ["#6366f1", "#8b5cf6"],
  ["#3b82f6", "#06b6d4"],
  ["#10b981", "#06b6d4"],
  ["#f59e0b", "#f97316"],
  ["#ec4899", "#f43f5e"],
  ["#8b5cf6", "#d946ef"],
];

function previewColors(id: string) {
  return PREVIEWS[id.charCodeAt(0) % PREVIEWS.length];
}

interface Folder {
  id: string;
  name: string;
}

interface Props {
  id: string;
  title: string;
  role: UserRole;
  updatedAt: Date;
  folderId: string | null;
  folderName?: string;
  allFolders: Folder[];
}

export function DocumentCard({ id, title, role, updatedAt, folderId, folderName, allFolders }: Props) {
  const router = useRouter();
  const [moveOpen, setMoveOpen] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const [c1, c2] = previewColors(id);

  return (
    <>
      <Link
        href={`/doc/${id}`}
        className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-950/5 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-200/60 hover:ring-zinc-950/10"
      >
        {/* Preview area */}
        <div
          className="relative h-24 w-full"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          {/* Subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          {/* Floating actions */}
          {role === "owner" && (
            <div className="absolute right-2.5 top-2.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => { e.preventDefault(); setMoveOpen(true); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 text-white backdrop-blur-sm hover:bg-black/40"
                title="Move to folder"
              >
                <FolderInput className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 text-white backdrop-blur-sm hover:bg-red-500/80"
                title="Delete document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 p-4">
          <p className="truncate text-sm font-semibold text-zinc-900">{title || "Untitled Document"}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </p>
            <div className="flex items-center gap-1.5">
              {folderName && (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">
                  {folderName}
                </span>
              )}
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs capitalize text-zinc-500">
                {role}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {moveOpen && (
        <MoveToFolderDialog
          documentId={id}
          currentFolderId={folderId}
          folders={allFolders}
          onClose={() => setMoveOpen(false)}
        />
      )}
    </>
  );
}
