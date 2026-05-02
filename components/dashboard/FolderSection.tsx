"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import type { UserRole } from "@/types";

interface Doc {
  id: string;
  title: string;
  role: string;
  updatedAt: Date;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
}

interface Props {
  folder: Folder;
  docs: Doc[];
  allFolders: Folder[];
}

export function FolderSection({ folder, docs, allFolders }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-600"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
        {folder.name}
        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-400 normal-case tracking-normal">{docs.length}</span>
      </button>

      {open && (
        docs.length === 0 ? (
          <p className="pl-6 text-sm text-zinc-400">No documents in this folder.</p>
        ) : (
          <div className="grid gap-4 pl-6 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                role={doc.role as UserRole}
                updatedAt={doc.updatedAt}
                folderId={doc.folderId}
                allFolders={allFolders}
              />
            ))}
          </div>
        )
      )}
    </section>
  );
}
