"use client";

import { useState, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, Camera, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { CollaborativeEditor } from "@/components/editor/CollaborativeEditor";
import { PresenceBar } from "@/components/editor/PresenceBar";
import { ShareDialog } from "@/components/editor/ShareDialog";
import { SnapshotPanel } from "@/components/editor/SnapshotPanel";
import { CommentSidebar } from "@/components/editor/CommentSidebar";
import { cn } from "@/lib/utils";
import type { UserRole, AwarenessUser } from "@/types";

type SidePanel = "none" | "snapshots" | "comments";

interface Props {
  documentId: string;
  initialTitle: string;
  role: UserRole;
  userName: string;
  userImageUrl?: string;
  clerkUserId: string;
}

export function EditorShell({
  documentId,
  initialTitle,
  role,
  userName,
  userImageUrl,
  clerkUserId,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const [activeUsers, setActiveUsers] = useState<Map<number, AwarenessUser>>(new Map());
  const [shareOpen, setShareOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");

  const canEdit = role === "owner" || role === "editor";

  const saveTitle = useCallback(
    async (newTitle: string) => {
      const trimmed = newTitle.trim() || "Untitled Document";
      if (trimmed === title) return;
      setTitle(trimmed);
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
    },
    [documentId, title]
  );

  function togglePanel(panel: SidePanel) {
    setSidePanel((p) => (p === panel ? "none" : panel));
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Top bar */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-5 py-2.5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-zinc-200" />
          {canEdit ? (
            <input
              className="w-72 truncate rounded-lg px-2 py-1 text-sm font-medium text-zinc-800 outline-none transition-colors hover:bg-zinc-50 focus:bg-zinc-100"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => saveTitle(titleDraft)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              maxLength={255}
            />
          ) : (
            <span className="text-sm font-medium text-zinc-800">{title}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <PresenceBar users={activeUsers} />

          <div className="h-4 w-px bg-zinc-200" />

          <PanelButton
            active={sidePanel === "snapshots"}
            onClick={() => togglePanel("snapshots")}
            title="Version history"
          >
            <Camera className="h-3.5 w-3.5" />
          </PanelButton>

          <PanelButton
            active={sidePanel === "comments"}
            onClick={() => togglePanel("comments")}
            title="Comments"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </PanelButton>

          {role === "owner" && (
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <Users className="h-3.5 w-3.5" />
              Share
            </button>
          )}

          <UserButton />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <main className="flex flex-1 overflow-auto">
          <CollaborativeEditor
            documentId={documentId}
            clerkUserId={clerkUserId}
            userName={userName}
            userImageUrl={userImageUrl}
            readOnly={!canEdit}
            onAwarenessChange={setActiveUsers}
          />
        </main>

        {/* Side panels */}
        {sidePanel === "snapshots" && (
          <SnapshotPanel
            documentId={documentId}
            canEdit={canEdit}
            onClose={() => setSidePanel("none")}
          />
        )}
        {sidePanel === "comments" && (
          <CommentSidebar
            documentId={documentId}
            canComment={canEdit}
            onClose={() => setSidePanel("none")}
          />
        )}
      </div>

      {shareOpen && (
        <ShareDialog
          documentId={documentId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function PanelButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
        active
          ? "border-indigo-200 bg-indigo-50 text-indigo-600"
          : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
      )}
    >
      {children}
    </button>
  );
}
