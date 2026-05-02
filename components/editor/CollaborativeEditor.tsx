"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { stringToColor } from "@/lib/utils";
import type { AwarenessUser } from "@/types";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { SlashCommandExtension } from "@/components/editor/slash/SlashCommandExtension";

interface Props {
  documentId: string;
  clerkUserId: string;
  userName: string;
  userImageUrl?: string;
  readOnly?: boolean;
  onAwarenessChange: (users: Map<number, AwarenessUser>) => void;
}

export function CollaborativeEditor({
  documentId,
  clerkUserId,
  userName,
  userImageUrl,
  readOnly = false,
  onAwarenessChange,
}: Props) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }

  if (!providerRef.current) {
    providerRef.current = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ?? "ws://localhost:1234",
      name: documentId,
      document: ydocRef.current,
      token: clerkUserId,
      onAwarenessChange({ states }) {
        const map = new Map<number, AwarenessUser>();
        for (const state of states) {
          if (state.user) {
            map.set(state.clientId, state.user as AwarenessUser);
          }
        }
        onAwarenessChange(map);
      },
    });
  }

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      providerRef.current = null;
      ydocRef.current?.destroy();
      ydocRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        // Collaboration handles undo/redo
        undoRedo: false,
      }),
      Collaboration.configure({
        document: ydocRef.current,
      }),
      Placeholder.configure({
        placeholder: "Start typing…",
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      CharacterCount,
      SlashCommandExtension,
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc max-w-none focus:outline-none min-h-full px-16 py-12",
      },
    },
  });

  return (
    <div className="flex w-full flex-col">
      {!readOnly && editor && <EditorToolbar editor={editor} />}
      <div className="flex flex-1 justify-center overflow-auto">
        <div className="w-full max-w-3xl">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
      {editor && (
        <div className="border-t border-zinc-100 px-4 py-1.5 text-right text-xs text-zinc-400">
          {editor.storage.characterCount.characters()} characters ·{" "}
          {editor.storage.characterCount.words()} words
        </div>
      )}
    </div>
  );
}
