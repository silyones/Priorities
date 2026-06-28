export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-2xl"
          style={{ background: "#F5C518", animation: "pulse 1.2s ease-in-out infinite" }}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full p-2.5" fill="none" style={{ color: "#0D0F14" }}>
            <path d="M5 17V11"  stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M12 17V6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M19 17V8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
          Loading…
        </p>
      </div>
    </div>
  );
}
