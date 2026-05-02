"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function NewFolderButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setName("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
      >
        <FolderPlus className="h-4 w-4" />
        New folder
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Folder name"
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <button
        onClick={handleCreate}
        disabled={loading || !name.trim()}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create"}
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-zinc-400 hover:text-zinc-700">
        Cancel
      </button>
    </div>
  );
}
