import Link from "next/link";

export function Logo({
  className = "",
  href = "/dashboard",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-accent shadow-soft">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-surface-white" fill="none">
          <path d="M5 17V11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 17V6"  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M19 17v-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="20" r="1.4" fill="currentColor" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold leading-none tracking-tight text-ink">
        People&apos;s
        <span className="block text-[15px] font-bold text-accent">Priorities</span>
      </span>
    </Link>
  );
}
