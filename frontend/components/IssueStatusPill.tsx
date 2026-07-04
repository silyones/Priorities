"use client";

import { issueStatusLabel } from "@/lib/issues";

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-cream text-ink-muted border-border-subtle",
  "Work in Progress": "bg-tag-orange-bg text-tag-orange-text border-tag-orange-text/20",
  Completed: "bg-tag-teal-bg text-tag-teal-text border-tag-teal-text/20",
};

export function IssueStatusPill({ status }: { status: string }) {
  const label = issueStatusLabel(status);
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Open;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}>
      {label}
    </span>
  );
}
