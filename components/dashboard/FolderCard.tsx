"use client";

import { useState } from "react";
import { FolderOpen, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
  onFilterFolder: (id: string) => void;
}

export function FolderCard({ id, name, onFilterFolder }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  async function handleRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) { setEditing(false); return; }
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setEditing(false);
    router.refresh();
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete folder "${name}"? Documents inside will be moved out.`)) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div
      onClick={() => !editing && onFilterFolder(id)}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <FolderOpen className="h-4 w-4 flex-shrink-0 text-amber-400" />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 rounded border border-blue-300 px-1 py-0.5 text-sm outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{name}</span>
      )}

      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="text-zinc-400 hover:text-zinc-700"
          title="Rename"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleDelete} className="text-zinc-400 hover:text-red-500" title="Delete folder">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
