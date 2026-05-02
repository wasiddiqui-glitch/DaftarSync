"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Circle, Send, Trash2, X } from "lucide-react";
import { stringToColor } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  resolved: boolean;
  createdAt: string;
  authorName: string;
  authorImageUrl: string | null;
}

interface Props {
  documentId: string;
  canComment: boolean;
  onClose: () => void;
}

export function CommentSidebar({ documentId, canComment, onClose }: Props) {
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}/comments`);
    if (res.ok) setAllComments(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allComments]);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setDraft("");
      await load();
    }
    setSending(false);
  }

  async function handleResolve(comment: Comment) {
    await fetch(`/api/documents/${documentId}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !comment.resolved }),
    });
    setAllComments((prev) =>
      prev.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
    );
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
      method: "DELETE",
    });
    setAllComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  const visible = allComments.filter((c) => showResolved || !c.resolved);

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Comments</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">
            {allComments.length === 0 ? "No comments yet." : "No open comments."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visible.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                canComment={canComment}
                onResolve={() => handleResolve(comment)}
                onDelete={() => handleDelete(comment.id)}
              />
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {canComment && (
        <div className="border-t border-zinc-200 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending…" : "Post comment"}
          </button>
        </div>
      )}
    </aside>
  );
}

function CommentItem({
  comment,
  canComment,
  onResolve,
  onDelete,
}: {
  comment: Comment;
  canComment: boolean;
  onResolve: () => void;
  onDelete: () => void;
}) {
  const color = stringToColor(comment.authorName);
  const initials = comment.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <li className={`group p-3 ${comment.resolved ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-2">
        {comment.authorImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.authorImageUrl}
            alt={comment.authorName}
            className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-zinc-800">{comment.authorName}</span>
            <span className="text-xs text-zinc-400">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-700">{comment.body}</p>
        </div>
      </div>
      {canComment && (
        <div className="mt-1.5 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onResolve}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-green-600"
          >
            {comment.resolved ? (
              <Circle className="h-3 w-3" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            {comment.resolved ? "Unresolve" : "Resolve"}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
