"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  Quote,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import {
  fetchSubmissionAnalysis,
  fetchSubmissionDetail,
  fetchSubmissionImage,
  type SubmissionAnalysis,
  type SubmissionDetail,
} from "@/lib/submissions";
import { CategoryBadge, UrgencyTag } from "@/components/ui";
import type { Category, Urgency } from "@/lib/types";

const up = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function severityToUrgency(severity: string): Urgency {
  if (severity === "Safety risk") return "safety";
  if (severity === "High priority") return "high";
  return "normal";
}

function issueTypeToCategory(issueType: string): Category {
  const map: Record<string, Category> = {
    Sanitation: "sanitation",
    Drainage: "sanitation",
    Roads: "roads",
    "Water Supply": "water",
    Electricity: "electricity",
  };
  return map[issueType] ?? "other";
}

function formatImageSrc(base64: string): string {
  if (base64.startsWith("data:")) return base64;
  return `data:image/jpeg;base64,${base64}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Date unknown";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IssueBriefClient({ submissionId: submissionIdProp }: { submissionId?: string }) {
  const params = useParams();
  const routeId = typeof params?.id === "string" ? params.id : "";
  const submissionId = submissionIdProp || routeId;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [analysis, setAnalysis] = useState<SubmissionAnalysis | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);

  useEffect(() => {
    if (!submissionId) {
      setLoadError("Invalid issue link");
      setLoadingDetail(false);
      setLoadingAnalysis(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoadingDetail(true);
      setLoadError(null);

      const detailResult = await fetchSubmissionDetail(submissionId);
      if (cancelled) return;

      if (!detailResult.ok) {
        setLoadError(detailResult.error);
        setLoadingDetail(false);
        setLoadingAnalysis(false);
        return;
      }

      setSubmission(detailResult.submission);
      setLoadingDetail(false);

      if (detailResult.submission.hasImage) {
        const imageResult = await fetchSubmissionImage(submissionId);
        if (!cancelled && imageResult.ok) {
          setImageSrc(formatImageSrc(imageResult.imageBase64));
        }
      }

      const analysisResult = await fetchSubmissionAnalysis(detailResult.submission);
      if (cancelled) return;

      if (analysisResult.ok) {
        setAnalysis(analysisResult.analysis);
      } else {
        setAnalysisError(analysisResult.error);
      }
      setLoadingAnalysis(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const title = useMemo(() => {
    if (!submission) return "Issue brief";
    return submission.topic?.trim() || submission.description?.trim().slice(0, 80) || "Untitled issue";
  }, [submission]);

  const mapsUrl = useMemo(() => {
    if (!submission?.latitude || !submission?.longitude) return null;
    return `https://www.google.com/maps?q=${submission.latitude},${submission.longitude}`;
  }, [submission]);

  if (loadingDetail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-cream">
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading issue brief…
        </div>
      </div>
    );
  }

  if (loadError || !submission) {
    return (
      <div className="min-h-screen bg-cream px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="card mt-6 flex items-start gap-3 p-6 text-sm text-tag-red-text">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Could not load this issue</p>
              <p className="mt-1 text-tag-red-text/80">{loadError ?? "Unknown error"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const urgency = severityToUrgency(submission.severity);
  const category = issueTypeToCategory(submission.issueType);

  return (
    <motion.div
      className="min-h-screen bg-cream"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={up} className="border-b border-border-subtle px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <p className="label mt-4">Citizen report · AI brief</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryBadge category={category} />
            <UrgencyTag urgency={urgency} />
            {submission.aiTags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-white px-2.5 py-0.5 text-[11px] font-medium text-ink-muted"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-5xl space-y-4 px-5 py-6 sm:px-8">
        <motion.div variants={up} className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border-subtle bg-tag-orange-bg/40 px-5 py-3.5">
                <Sparkles className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-bold text-ink">AI Summary</h2>
              </div>
              <div className="px-5 py-4">
                {loadingAnalysis ? (
                  <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating analysis…
                  </div>
                ) : analysisError ? (
                  <p className="text-sm text-tag-red-text">{analysisError}</p>
                ) : (
                  <p className="text-sm leading-relaxed text-ink">{analysis?.summary}</p>
                )}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border-subtle bg-tag-teal-bg/50 px-5 py-3.5">
                <Building2 className="h-4 w-4 text-tag-teal-text" />
                <h2 className="text-sm font-bold text-ink">AI Recommendation</h2>
              </div>
              <div className="px-5 py-4">
                {loadingAnalysis ? (
                  <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing action steps…
                  </div>
                ) : analysis ? (
                  <ol className="space-y-2.5">
                    {analysis.recommendation.map((step, i) => (
                      <li key={step} className="flex gap-3 text-sm text-ink">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream font-mono text-xs font-bold text-accent">
                          {i + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <Quote className="h-4 w-4 text-ink-muted" />
                Citizen&apos;s words
              </div>
              {submission.topic?.trim() && (
                <p className="mt-3 text-base font-semibold text-ink">{submission.topic}</p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                {submission.description}
              </p>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {imageSrc && (
              <div className="card overflow-hidden">
                <div className="border-b border-border-subtle px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                  Photo evidence
                </div>
                <img
                  src={imageSrc}
                  alt="Citizen-submitted photo of the issue"
                  className="max-h-64 w-full object-cover"
                />
                {analysis?.imageCaption && (
                  <p className="border-t border-border-subtle px-4 py-3 text-xs text-ink-muted">
                    {analysis.imageCaption}
                  </p>
                )}
              </div>
            )}

            <div className="card p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                Issue at a glance
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                  <div>
                    <dt className="text-xs text-ink-muted">Location</dt>
                    <dd className="font-medium text-ink">
                      {submission.locality?.trim() || "Location not provided"}
                    </dd>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
                      >
                        Open in Maps
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                  <div>
                    <dt className="text-xs text-ink-muted">Suggested routing</dt>
                    <dd className="font-medium text-ink">
                      {loadingAnalysis ? "…" : analysis?.suggestedDepartment ?? "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                  <div>
                    <dt className="text-xs text-ink-muted">Submitted for</dt>
                    <dd className="font-medium text-ink">
                      {submission.submittedFor === "someone_else"
                        ? "Someone else (relay)"
                        : "Themselves"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                  <div>
                    <dt className="text-xs text-ink-muted">Received</dt>
                    <dd className="font-medium text-ink">{formatDate(submission.createdAt)}</dd>
                  </div>
                </div>
              </dl>
            </div>

            {!loadingAnalysis && analysis?.urgencyRationale && (
              <div className="rounded-2xl border border-tag-orange-text/20 bg-tag-orange-bg/60 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-tag-orange-text">
                  Urgency rationale
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  {analysis.urgencyRationale}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-border-subtle bg-surface-white/70 px-4 py-3 text-xs text-ink-muted">
              AI brief is generated on demand via LLM from the citizen&apos;s report.
              Review before forwarding to departments.
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
