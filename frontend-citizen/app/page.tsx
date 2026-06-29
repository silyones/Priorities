import Link from "next/link";
import { Mic, MessageSquare, Layers, BarChart3, Globe } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    title: "Speak or type your issue",
    description:
      "Describe a local need in your own words — by voice or text, in any language you’re comfortable with.",
  },
  {
    icon: Layers,
    title: "AI groups similar voices",
    description:
      "Your submission is matched with others raising the same theme, so scattered concerns become one clear signal.",
  },
  {
    icon: BarChart3,
    title: "Your MP sees real demand",
    description:
      "Themes are ranked by how many people are affected — so your representative can act on what matters most.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="container-pp flex flex-col items-center px-5 pb-20 pt-16 text-center sm:px-8 sm:pt-24 sm:pb-28">
        <p className="label mb-4">Bengaluru North Constituency</p>
        <h1 className="display max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Your voice, heard by your MP
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">
          Tell us what your ward needs — roads, water, schools, health, or anything else.
          One honest submission helps shape what gets priority.
        </p>
        <Link
          href="/submit"
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-accent px-10 py-5 text-lg font-bold text-surface-white shadow-glow transition-all hover:-translate-y-0.5 hover:bg-accent-hover sm:mt-12 sm:px-12 sm:py-6 sm:text-xl"
        >
          <Mic className="h-6 w-6 sm:h-7 sm:w-7" />
          Submit a Voice
        </Link>
      </section>

      {/* How it works */}
      <section className="border-t border-border-subtle bg-surface-white py-16 sm:py-24">
        <div className="container-pp">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-ink-muted">
              Three simple steps — no account, no tracking number, no bureaucracy.
            </p>
          </div>

          <ol className="mx-auto mt-12 grid max-w-5xl gap-6 sm:mt-16 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="card flex flex-col p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-accent">
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <span className="font-mono text-xs font-medium uppercase tracking-widest text-ink-muted">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>

          <p className="mx-auto mt-12 flex max-w-lg items-center justify-center gap-2 text-center text-sm text-ink-muted sm:mt-16">
            <Globe className="h-4 w-4 shrink-0 text-accent" />
            Available in Kannada, Hindi, English, Tamil, Telugu, Bengali, and more.
          </p>
        </div>
      </section>
    </div>
  );
}
