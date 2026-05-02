"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";

interface Props {
  label?: string;
}

export function NewDocumentButton({ label = "New document" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      const data = await res.json();
      if (data.id) {
        router.push(`/doc/${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-60"
    >
      <Plus className="h-4 w-4" />
      {loading ? "Creating…" : label}
    </button>
  );
}
