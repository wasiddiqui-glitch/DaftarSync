"use client";

import { useState } from "react";
import { X, FolderOpen, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";

interface Folder {
  id: string;
  name: string;
}

interface Props {
  documentId: string;
  currentFolderId: string | null;
  folders: Folder[];
  onClose: () => void;
}

export function MoveToFolderDialog({ documentId, currentFolderId, folders, onClose }: Props) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);

  async function moveTo(folderId: string | null) {
    setMoving(true);
    await fetch(`/api/documents/${documentId}/folder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    setMoving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Move to folder</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-3 space-y-1">
          <li>
            <button
              onClick={() => moveTo(null)}
              disabled={moving || currentFolderId === null}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              <Inbox className="h-4 w-4 text-zinc-400" />
              No folder (root)
            </button>
          </li>
          {folders.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => moveTo(f.id)}
                disabled={moving || currentFolderId === f.id}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                <FolderOpen className="h-4 w-4 text-amber-400" />
                {f.name}
              </button>
            </li>
          ))}
        </ul>

        {folders.length === 0 && (
          <p className="mt-3 text-center text-xs text-zinc-400">
            No folders yet. Create one from the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
