"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Camera, RotateCcw, Trash2, X } from "lucide-react";

interface Snapshot {
  id: string;
  label: string;
  createdAt: string;
}

interface Props {
  documentId: string;
  canEdit: boolean;
  onClose: () => void;
}

export function SnapshotPanel({ documentId, canEdit, onClose }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelDraft, setLabelDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}/snapshots`);
    if (res.ok) setSnapshots(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [documentId]);

  async function handleSave() {
    const label = labelDraft.trim();
    if (!label) return;
    setSaving(true);
    const res = await fetch(`/api/documents/${documentId}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      setLabelDraft("");
      await load();
    }
    setSaving(false);
  }

  async function handleRestore(snapshotId: string) {
    if (!confirm("Restore this snapshot? The current document content will be replaced.")) return;
    setRestoringId(snapshotId);
    await fetch(`/api/documents/${documentId}/snapshots/${snapshotId}`, {
      method: "POST",
    });
    setRestoringId(null);
    alert("Restored. Reload the page to see the restored content.");
  }

  async function handleDelete(snapshotId: string) {
    if (!confirm("Delete this snapshot?")) return;
    await fetch(`/api/documents/${documentId}/snapshots/${snapshotId}`, {
      method: "DELETE",
    });
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  }

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Version history</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {canEdit && (
        <div className="border-b border-zinc-100 p-3">
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="Snapshot name…"
            className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={saving || !labelDraft.trim()}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save snapshot"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">Loading…</p>
        ) : snapshots.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">
            No snapshots yet.{canEdit ? " Save one above." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {snapshots.map((s) => (
              <li key={s.id} className="group flex items-start gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">{s.label}</p>
                  <p className="text-xs text-zinc-400">
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleRestore(s.id)}
                      disabled={restoringId === s.id}
                      title="Restore"
                      className="text-zinc-400 hover:text-blue-600"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      title="Delete"
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
