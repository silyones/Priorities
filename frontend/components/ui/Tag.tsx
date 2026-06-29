import type { ReactNode } from "react";

export type TagColor = "red" | "teal" | "orange" | "blue" | "pink";

const TAG_STYLES: Record<TagColor, string> = {
  red:    "bg-tag-red-bg text-tag-red-text",
  teal:   "bg-tag-teal-bg text-tag-teal-text",
  orange: "bg-tag-orange-bg text-tag-orange-text",
  blue:   "bg-tag-blue-bg text-tag-blue-text",
  pink:   "bg-tag-pink-bg text-tag-pink-text",
};

export function Tag({
  color,
  children,
  className = "",
}: {
  color: TagColor;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TAG_STYLES[color]} ${className}`}
    >
      {children}
    </span>
  );
}
