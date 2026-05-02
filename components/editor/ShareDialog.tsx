"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  documentId: string;
  onClose: () => void;
}

export function ShareDialog({ documentId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await fetch(`/api/documents/${documentId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (res.ok) {
      setStatus("success");
      setEmail("");
    } else {
      const data = await res.json();
      setErrorMsg(data.error ?? "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Share document</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="editor">Editor — can edit</option>
              <option value="viewer">Viewer — read only</option>
            </select>
          </div>

          {status === "success" && (
            <p className="text-sm text-green-600">Invitation sent!</p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-500">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {status === "loading" ? "Sending…" : "Invite"}
          </button>
        </form>

        <p className="mt-3 text-xs text-zinc-400">
          The user must have signed in to DaftarSync at least once before they can be invited.
        </p>
      </div>
    </div>
  );
}
