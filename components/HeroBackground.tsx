// Editorial backdrop: warm paper, a fine survey-sheet grid, and a single
// soft warm tint anchored to a corner. No glowing gradient blobs — this is
// meant to read like a well-made civic document, not a generic SaaS hero.
export function HeroBackground({ dim = false }: { dim?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg" />
      {/* warm vignette tints, static and subtle */}
      <div
        className="absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(29,101,67,0.10), rgba(29,101,67,0) 70%)",
        }}
      />
      <div
        className="absolute -right-28 top-24 h-[28rem] w-[28rem] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(189,90,51,0.10), rgba(189,90,51,0) 70%)",
        }}
      />
      {dim && <div className="absolute inset-0 bg-paper/30" />}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-paper" />
    </div>
  );
}
