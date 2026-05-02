"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { SlashCommand } from "./commands";

interface Props {
  items: SlashCommand[];
  command: (item: SlashCommand) => void;
}

export interface SlashCommandMenuRef {
  handleKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      handleKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selectedIndex]) {
            command(items[selectedIndex]);
          }
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) return null;

    return (
      <div className="z-50 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
        {items.map((item, index) => (
          <button
            key={item.title}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
              index === selectedIndex
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-50"
            )}
            onClick={() => command(item)}
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-zinc-200 bg-white text-xs font-bold text-zinc-600">
              {item.icon}
            </span>
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-zinc-400">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

SlashCommandMenu.displayName = "SlashCommandMenu";
