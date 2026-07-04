"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Phone } from "lucide-react";
import { fetchIssueSubscribers, type IssueSubscriber } from "@/lib/issues";

export function SubscriberPanel({
  issueId,
  subscriberCount,
  compact = false,
}: {
  issueId: string;
  subscriberCount: number;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<IssueSubscriber[] | null>(null);

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (!next || subscribers !== null || subscriberCount === 0) return;

    setLoading(true);
    setError(null);
    const result = await fetchIssueSubscribers(issueId);
    setLoading(false);
    if (result.ok) {
      setSubscribers(result.subscribers);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className={compact ? "" : "rounded-xl border border-border-subtle bg-surface-white/70 p-3"}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggle();
        }}
        disabled={subscriberCount === 0}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-ink-muted disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          {subscriberCount} SMS subscriber{subscriberCount === 1 ? "" : "s"}
        </span>
        {subscriberCount > 0 && (
          expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && subscriberCount > 0 && (
        <div className="mt-2 border-t border-border-subtle pt-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading numbers…
            </div>
          )}
          {error && <p className="text-xs text-tag-red-text">{error}</p>}
          {subscribers && subscribers.length === 0 && (
            <p className="text-xs text-ink-muted">No subscribers on file.</p>
          )}
          {subscribers && subscribers.length > 0 && (
            <ul className="space-y-1">
              {subscribers.map((sub) => (
                <li
                  key={sub.phoneNumber}
                  className="font-mono text-xs text-ink"
                >
                  {sub.phoneNumber}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
