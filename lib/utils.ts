import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic color from a string (for cursor/avatar colors) */
export function stringToColor(str: string): string {
  const colors = [
    "#f87171", "#fb923c", "#facc15", "#4ade80",
    "#34d399", "#22d3ee", "#60a5fa", "#a78bfa",
    "#f472b6", "#e879f9",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
