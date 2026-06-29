import { Tag } from "@/components/ui/Tag";

const CORE_SWATCHES = [
  { name: "bg-cream",        className: "bg-cream",        hex: "#F3EEE4", textClass: "text-ink" },
  { name: "surface-white",   className: "bg-surface-white", hex: "#FFFFFF", textClass: "text-ink", border: true },
  { name: "ink",             className: "bg-ink",          hex: "#141414", textClass: "text-surface-white" },
  { name: "ink-muted",       className: "bg-ink-muted",    hex: "#6B6B68", textClass: "text-surface-white" },
  { name: "accent",          className: "bg-accent",       hex: "#C2502E", textClass: "text-surface-white" },
  { name: "accent-hover",    className: "bg-accent-hover", hex: "#A8401F", textClass: "text-surface-white" },
  { name: "border-subtle",   className: "bg-border-subtle", hex: "#E7E2D6", textClass: "text-ink" },
  { name: "warning-bg",      className: "bg-warning-bg",   hex: "#FBEFD2", textClass: "text-ink" },
] as const;

const TAG_SAMPLES: { color: Parameters<typeof Tag>[0]["color"]; label: string }[] = [
  { color: "red",    label: "Safety risk" },
  { color: "teal",   label: "Sanitation" },
  { color: "teal",   label: "Water" },
  { color: "orange", label: "High priority" },
  { color: "blue",   label: "Roads" },
  { color: "blue",   label: "Electricity" },
  { color: "pink",   label: "Health" },
];

function Swatch({
  name,
  className,
  hex,
  textClass,
  border,
}: {
  name: string;
  className: string;
  hex: string;
  textClass: string;
  border?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex h-24 items-end rounded-xl p-3 ${className} ${textClass} ${border ? "border border-border-subtle" : ""}`}
      >
        <span className="text-xs font-mono font-medium">{hex}</span>
      </div>
      <span className="text-sm font-medium text-ink">{name}</span>
    </div>
  );
}

export default function StylePreviewPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="container-pp py-12">
        <header className="mb-12">
          <p className="label mb-2 text-ink-muted">Design tokens</p>
          <h1 className="display text-4xl font-semibold tracking-tight">Style preview</h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Cream / black / rust palette — verify colors before restyling the app.
          </p>
        </header>

        <section className="mb-14">
          <h2 className="mb-6 text-lg font-semibold">Core palette</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CORE_SWATCHES.map((s) => (
              <Swatch key={s.name} {...s} />
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 text-lg font-semibold">Tag variants</h2>
          <div className="rounded-2xl border border-border-subtle bg-surface-white p-6">
            <div className="flex flex-wrap gap-3">
              {TAG_SAMPLES.map(({ color, label }) => (
                <Tag key={label} color={color}>
                  {label}
                </Tag>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 text-lg font-semibold">Accent CTA</h2>
          <div className="rounded-2xl border border-border-subtle bg-surface-white p-6">
            <button
              type="button"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-surface-white transition-colors hover:bg-accent-hover"
            >
              Primary action
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-lg font-semibold">Warning banner</h2>
          <div
            className="rounded-r-xl border-l-4 border-accent bg-warning-bg px-5 py-4 text-sm text-ink"
            role="status"
          >
            This ward has unresolved safety reports that need attention before the next site visit.
          </div>
        </section>
      </div>
    </div>
  );
}
