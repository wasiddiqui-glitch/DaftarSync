"use client";

import type { AwarenessUser } from "@/types";
import { stringToColor } from "@/lib/utils";

interface Props {
  users: Map<number, AwarenessUser>;
}

export function PresenceBar({ users }: Props) {
  const list = Array.from(users.values());
  if (list.length === 0) return null;

  const visible = list.slice(0, 5);
  const overflow = list.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((user, i) => (
        <Avatar key={i} user={user} />
      ))}
      {overflow > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-300 text-xs font-medium text-zinc-700">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function Avatar({ user }: { user: AwarenessUser }) {
  const color = user.color ?? stringToColor(user.name);
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (user.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.imageUrl}
        alt={user.name}
        title={user.name}
        className="h-7 w-7 rounded-full border-2 border-white object-cover"
      />
    );
  }

  return (
    <div
      title={user.name}
      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
